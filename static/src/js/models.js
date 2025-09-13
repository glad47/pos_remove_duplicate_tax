/** @odoo-module **/

import { Order, PosGlobalState } from 'point_of_sale.models';
import Registries from 'point_of_sale.Registries';
import core from 'web.core';
import concurrency from 'web.concurrency';
import { sprintf } from '@web/core/utils/strings';
import { Gui } from 'point_of_sale.Gui';
import { Domain, InvalidDomainError } from '@web/core/domain';


const _t = core._t;
const dropPrevious = new concurrency.MutexedDropPrevious(); // Used for queuing reward updates

let pointsForProgramsCountedRules = {};
const PosUpdateLoyaltyOrder = (Order) => class PosUpdateLoyaltyOrder extends Order {
    _programIsApplicable(program) {
        if (!program) {
            return false;
        }
        if (!program.rules) {
            return false;
        }
        if (program.trigger === 'auto' && !program.rules.find((rule) => rule.mode === 'auto' || this.codeActivatedProgramRules.includes(rule.id))) {
            return false;
        }
        if (program.trigger === 'with_code' && !program.rules.find((rule) => this.codeActivatedProgramRules.includes(rule.id))) {
            return false;
        }
        if (program.is_nominative && !this.get_partner()) {
            return false;
        }

        if (program.date_to && program.date_to <= new Date()) {
            return false;
        }
        if (program.limit_usage && program.total_order_count >= program.max_usage) {
            return false;
        }
        return true;
    }
    _getGlobalDiscountLines() {
        return this.get_orderlines().filter((line) => line.reward_id && this.pos.reward_by_id && this.pos.reward_by_id[line.reward_id] && this.pos.reward_by_id[line.reward_id].is_global_discount);
    }

    _updateRewards() {
        // Calls are not expected to take some time besides on the first load + when loyalty programs are made applicable
        if (this.pos.programs.length === 0) {
            return;
        }
        dropPrevious.exec(() => {
            return this._updateLoyaltyPrograms().then(async () => {
                // Try auto claiming rewards
                const claimableRewards = this.getClaimableRewards(false, false, true);
                let changed = false;
                for (const { coupon_id, reward } of claimableRewards) {
                    if (reward && reward.program_id) {
                        if (reward.program_id.rewards.length === 1 && !reward.program_id.is_nominative &&
                            (reward.reward_type !== 'product' || (reward.reward_type == 'product' && !reward.multi_product))) {
                            this._applyReward(reward, coupon_id);
                            changed = true;
                        }
                    }
                }
                // Rewards may impact the number of points gained
                if (changed) {
                    await this._updateLoyaltyPrograms();
                }
                this._updateRewardLines();
            })
        }).catch(() => {/* catch the reject of dp when calling `add` to avoid unhandledrejection */
        });
    }

    pointsForPrograms(programs) {
        pointsForProgramsCountedRules = {};
        const orderLines = this.get_orderlines().filter((line) => !line.refunded_orderline_id);
        const linesPerRule = {};
        for (const line of orderLines) {
            const reward = line.reward_id
                ? this.pos.reward_by_id[line.reward_id]
                : undefined;
            const isDiscount = reward && reward.reward_type === "discount";
            const rewardProgram = reward && reward.program_id;
            // Skip lines for automatic discounts.
            if (isDiscount && rewardProgram && rewardProgram.trigger === 'auto') {
                continue;
            }
            for (const program of programs) {
                // Skip lines for the current program's discounts.
                if (isDiscount && rewardProgram && rewardProgram.id === program.id) {
                    continue;
                }
                if (program && program.rules) {
                    for (const rule of program.rules) {
                        // Skip lines to which the rule doesn't apply.
                        if (rule.any_product || rule.valid_product_ids.has(line.get_product().id)) {
                            if (!linesPerRule[rule.id]) {
                                linesPerRule[rule.id] = [];
                            }
                            linesPerRule[rule.id].push(line);
                        }
                    }
                }
            }
        }
        const result = {}
        for (const program of programs) {
            let points = 0;
            const splitPoints = [];
            if (!program || !program.rules) {
                continue
            }
            for (const rule of program.rules) {
                if (rule.mode === 'with_code' && !this.codeActivatedProgramRules.includes(rule.id)) {
                    continue;
                }
                const linesForRule = linesPerRule[rule.id] ? linesPerRule[rule.id] : [];
                const amountWithTax = linesForRule.reduce((sum, line) => sum + line.get_price_with_tax(), 0);
                const amountWithoutTax = linesForRule.reduce((sum, line) => sum + line.get_price_without_tax(), 0);
                const amountCheck = rule.minimum_amount_tax_mode === 'incl' && amountWithTax || amountWithoutTax;
                if (rule.minimum_amount > amountCheck) {
                    continue;
                }
                let totalProductQty = 0;
                // Only count points for paid lines.
                const qtyPerProduct = {};
                let orderedProductPaid = 0;
                for (const line of orderLines) {
                    if (((!line.reward_product_id && (rule.any_product || rule.valid_product_ids.has(line.get_product().id))) ||
                        (line.reward_product_id && (rule.any_product || rule.valid_product_ids.has(line.reward_product_id)))) &&
                        !line.ignoreLoyaltyPoints({ program })) {
                        if (line.is_reward_line) {
                            const reward = this.pos.reward_by_id[line.reward_id];
                            if (!reward) {
                                continue
                            }
                            if (reward.program_id) {
                                if ((program.id === reward.program_id.id) || ['gift_card', 'ewallet'].includes(reward.program_id.program_type)) {
                                    continue;
                                }
                            }
                        }
                        const lineQty = (line.reward_product_id ? -line.get_quantity() : line.get_quantity());
                        if (qtyPerProduct[line.reward_product_id || line.get_product().id]) {
                            qtyPerProduct[line.reward_product_id || line.get_product().id] += lineQty;
                        } else {
                            qtyPerProduct[line.reward_product_id || line.get_product().id] = lineQty;
                        }
                        orderedProductPaid += line.get_price_with_tax();
                        if (!line.is_reward_line) {
                            totalProductQty += lineQty;
                        }
                    }
                }
                if (totalProductQty < rule.minimum_qty) {
                    // Should also count the points from negative quantities.
                    // For example, when refunding an ewallet payment. See TicketScreen override in this addon.
                    continue;
                }
                if (!(program.id in pointsForProgramsCountedRules)) {
                    pointsForProgramsCountedRules[program.id] = [];
                }
                pointsForProgramsCountedRules[program.id].push(rule.id)
                if (program.applies_on === 'future' && rule.reward_point_split && rule.reward_point_mode !== 'order') {
                    // In this case we count the points per rule
                    if (rule.reward_point_mode === 'unit') {
                        splitPoints.push(...Array.apply(null, Array(totalProductQty)).map((_) => {
                            return { points: rule.reward_point_amount }
                        }));
                    } else if (rule.reward_point_mode === 'money') {
                        for (const line of orderLines) {
                            if (line.is_reward_line || !(rule.valid_product_ids.has(line.get_product().id)) || line.get_quantity() <= 0
                                || line.ignoreLoyaltyPoints({ program })) {
                                continue;
                            }
                            const pointsPerUnit = round_precision(rule.reward_point_amount * line.get_price_with_tax() / line.get_quantity(), 0.01);
                            if (pointsPerUnit > 0) {
                                splitPoints.push(...Array.apply(null, Array(line.get_quantity())).map(() => {
                                    if (line.giftBarcode && line.get_quantity() == 1) {
                                        return {
                                            points: pointsPerUnit,
                                            barcode: line.giftBarcode,
                                            giftCardId: line.giftCardId
                                        };
                                    }
                                    return { points: pointsPerUnit }
                                }));
                            }
                        }
                    }
                } else {
                    // In this case we add on to the global point count
                    if (rule.reward_point_mode === 'order') {
                        points += rule.reward_point_amount;
                    } else if (rule.reward_point_mode === 'money') {
                        // NOTE: unlike in sale_loyalty this performs a round half-up instead of round down
                        points += round_precision(rule.reward_point_amount * orderedProductPaid, 0.01);
                    } else if (rule.reward_point_mode === 'unit') {
                        points += rule.reward_point_amount * totalProductQty;
                    }
                }
            }
            const res = (points || program.program_type === 'coupons') ? [{ points }] : [];
            if (splitPoints.length) {
                res.push(...splitPoints);
            }
            result[program.id] = res;
        }
        return result;
    }

    getLoyaltyPoints() {
        // map: couponId -> LoyaltyPoints
        const loyaltyPoints = {};
        for (const pointChange of Object.values(this.couponPointChanges)) {
            const { coupon_id, points, program_id } = pointChange;
            const program = this.pos.program_by_id[program_id];
            if ((program && program.program_type !== 'loyalty') || !program) {
                // Not a loyalty program, skip
                continue;
            }

            const loyaltyCard = this.pos.couponCache[coupon_id] || /* or new card */ { id: coupon_id, balance: 0 };
            let [won, spent, total] = [0, 0, 0];
            let balance = loyaltyCard.balance;
            won += points - this._getPointsCorrection(program);
            if (coupon_id !== 0) {
                for (const line of this._get_reward_lines()) {
                    if (line.coupon_id === coupon_id) {
                        spent += line.points_cost;
                    }
                }
            }
            total = balance + won - spent;
            const name = program.portal_visible ? program.portal_point_name : _t('Points');
            loyaltyPoints[coupon_id] = {
                won: parseFloat(won.toFixed(2)),
                spent: parseFloat(spent.toFixed(2)),
                // Display total when order is ongoing.
                total: parseFloat(total.toFixed(2)),
                // Display balance when order is done.
                balance: parseFloat(balance.toFixed(2)),
                name,
                program,
            };
        }
        return Object.entries(loyaltyPoints).map(([couponId, points]) => ({ couponId, points, program: points.program }));
    }

    getPotentialFreeProductRewards() {
        const allCouponPrograms = Object.values(this.couponPointChanges).map((pe) => {
            return {
                program_id: pe.program_id,
                coupon_id: pe.coupon_id,
            };
        }).concat(this.codeActivatedCoupons.map((coupon) => {
            return {
                program_id: coupon.program_id,
                coupon_id: coupon.id,
            };
        }));
        const result = [];
        for (const couponProgram of allCouponPrograms) {
            const program = this.pos.program_by_id[couponProgram.program_id];
            const points = this._getRealCouponPoints(couponProgram.coupon_id);
            const hasLine = this.orderlines.filter(line => !line.is_reward_line).length > 0;
            if (program && program.rewards) {
                for (const reward of program.rewards.filter(reward => reward.reward_type == 'product')) {
                    if (points < reward.required_points) {
                        continue;
                    }
                    // Loyalty program (applies_on == 'both') should needs an orderline before it can apply a reward.
                    const considerTheReward = program.applies_on !== 'both' || (program.applies_on == 'both' && hasLine);
                    if (reward.reward_type === 'product' && considerTheReward) {
                        let hasPotentialQty = true;
                        let potentialQty;
                        for (const productId of reward.reward_product_ids) {
                            const product = this.pos.db.get_product_by_id(productId);
                            potentialQty = this._computePotentialFreeProductQty(reward, product, points);
                            if (potentialQty <= 0) {
                                hasPotentialQty = false;
                            }
                        }
                        if (hasPotentialQty) {
                            result.push({
                                coupon_id: couponProgram.coupon_id,
                                reward: reward,
                                potentialQty
                            });
                        }
                    }
                }
            }
        }
        return result;
    }

    _getRealCouponPoints(coupon_id) {
        let points = 0;
        const dbCoupon = this.pos.couponCache[coupon_id];
        if (dbCoupon) {
            points += dbCoupon.balance;
        }
        Object.values(this.couponPointChanges).some((pe) => {
            if (pe.coupon_id === coupon_id) {
                if (pe.program_id && this.pos.program_by_id[pe.program_id] && this.pos.program_by_id[pe.program_id].applies_on !== 'future') {
                    points += pe.points;
                }
                // couponPointChanges is not supposed to have a coupon multiple times
                return true;
            }
            return false
        });
        for (const line of this.get_orderlines()) {
            if (line.is_reward_line && line.coupon_id === coupon_id) {
                points -= line.points_cost;
            }
        }
        return points
    }

    getClaimableRewards(coupon_id = false, program_id = false, auto = false) {
        const allCouponPrograms = Object.values(this.couponPointChanges).map((pe) => {
            return {
                program_id: pe.program_id,
                coupon_id: pe.coupon_id,
            };
        }).concat(this.codeActivatedCoupons.map((coupon) => {
            return {
                program_id: coupon.program_id,
                coupon_id: coupon.id,
            };
        }));
        const result = [];
        const totalWithTax = this.get_total_with_tax();
        const totalWithoutTax = this.get_total_without_tax();
        const totalIsZero = totalWithTax === 0;
        const globalDiscountLines = this._getGlobalDiscountLines();
        const globalDiscountPercent = globalDiscountLines.length ?
            this.pos.reward_by_id[globalDiscountLines[0].reward_id].discount : 0;
        for (const couponProgram of allCouponPrograms) {
            if (!couponProgram || !couponProgram.program_id) {
                continue;
            }
            const program = this.pos.program_by_id[couponProgram.program_id];
            if (!program) {
                continue;
            }
            if (program.trigger == 'with_code') {
                // For coupon programs, the rules become conditions.
                // Points to purchase rewards will only come from the scanned coupon.
                if (!this._canGenerateRewards(program, totalWithTax, totalWithoutTax)) {
                    continue;
                }
                ;
            }
            if ((coupon_id && couponProgram.coupon_id !== coupon_id) ||
                (program_id && couponProgram.program_id !== program_id)) {
                continue;
            }
            const points = this._getRealCouponPoints(couponProgram.coupon_id);
            if (!program.rewards) {
                continue;
            }
            for (const reward of program.rewards) {
                if (points < reward.required_points) {
                    continue;
                }
                if (auto && this.disabledRewards.has(reward.id)) {
                    continue;
                }
                // Try to filter out rewards that will not be claimable anyway.
                if (reward.is_global_discount && reward.discount <= globalDiscountPercent) {
                    continue;
                }
                if (reward.reward_type === 'discount' && totalIsZero) {
                    continue;
                }
                let potentialQty;
                if (reward.reward_type === 'product') {
                    if (!reward.multi_product) {
                        const product = this.pos.db.get_product_by_id(reward.reward_product_ids[0]);
                        potentialQty = this._computeUnclaimedFreeProductQty(reward, couponProgram.coupon_id, product, points);
                    }
                    if (!potentialQty || potentialQty <= 0) {
                        continue;
                    }
                }
                result.push({
                    coupon_id: couponProgram.coupon_id,
                    reward: reward,
                    potentialQty
                });
            }
        }
        return result;
    }

    _updateRewardLines() {
        if (!this.orderlines.length) {
            return;
        }
        const rewardLines = this._get_reward_lines();
        if (!rewardLines.length) {
            return;
        }
        const productRewards = []
        const otherRewards = [];
        const paymentRewards = []; // Gift card and ewallet rewards are considered payments and must stay at the end

        for (const line of rewardLines) {
            const claimedReward = {
                reward: this.pos.reward_by_id[line.reward_id],
                coupon_id: line.coupon_id,
                args: {
                    product: line.reward_product_id,
                },
                reward_identifier_code: line.reward_identifier_code,
            }
            if (claimedReward) {
                if ((claimedReward.reward && claimedReward.reward.program_id && claimedReward.reward.program_id.program_type === 'gift_card') ||
                    (claimedReward.reward && claimedReward.reward.program_id && claimedReward.reward.program_id.program_type === 'ewallet')) {
                    paymentRewards.push(claimedReward);
                } else if (claimedReward.reward && claimedReward.reward.reward_type === 'product') {
                    productRewards.push(claimedReward);
                } else if (!otherRewards.some(reward => reward.reward_identifier_code === claimedReward.reward_identifier_code)) {
                    otherRewards.push(claimedReward);
                }
            }
            this.orderlines.remove(line);
        }
        for (const claimedReward of productRewards.concat(otherRewards).concat(paymentRewards)) {
            // For existing coupons check that they are still claimed, they can exist in either `couponPointChanges` or `codeActivatedCoupons`
            if (!this.codeActivatedCoupons.find((coupon) => coupon.id === claimedReward.coupon_id) &&
                !this.couponPointChanges[claimedReward.coupon_id]) {
                continue;
            }
            this._applyReward(claimedReward.reward, claimedReward.coupon_id, claimedReward.args);
        }
    }
}
Registries.Model.extend(Order, PosUpdateLoyaltyOrder);
const PosUpdaterState = (PosGlobalState) => class PosUpdaterState extends PosGlobalState {
    async after_load_server_data() {
        await super.after_load_server_data();
        this.db.sync_date = moment().utc().format("YYYY-MM-DD hh:mm:ss");
    }

    async remove_server_data(payload = undefined) {
        var syncedData = payload;
        var updateLoyalty = false;
        if (syncedData['loyalty.reward']) {
            var indexes = [];
            for (const reward_id of syncedData['loyalty.reward']) {
                this.rewards.forEach((reward, i) => {
                    if (reward.id == reward_id) {
                        indexes.push(i);
                    }
                })
            }
            for (const index of indexes) {
                updateLoyalty = true;
                if (this.rewards[index]) {
                    this.reward_by_id[this.rewards[index].id] = undefined;
                    this.rewards.splice(index, 1);
                }
            }

        }

        if (syncedData['loyalty.rule']) {
            var indexes = [];
            for (const rule_id of syncedData['loyalty.rule']) {
                this.rules.forEach((rule, i) => {
                    if (rule.id == rule_id) {
                        indexes.push(i);
                    }
                })
            }
            for (const index of indexes) {
                if (this.rules[index]) {
                    this.rule_by_id[this.rules[index].id] = undefined;
                    this.rules.splice(index, 1);
                }
                updateLoyalty = true;
            }

        }
        if (syncedData['loyalty.program']) {
            var indexes = [];
            for (const program_id of syncedData['loyalty.program']) {
                this.programs.forEach((program, i) => {
                    if (program.id == program_id) {
                        indexes.push(i);
                    }
                })
            }
            for (const index of indexes) {
                if (this.programs[index]) {
                    this.program_by_id[this.programs[index].id] = undefined;
                    this.programs.splice(index, 1);
                }
                updateLoyalty = true;
            }

        }
        if (this.selectedOrder && updateLoyalty) {
            this.selectedOrder._resetPrograms();
        }
    }

    async sync_server_data(payload = undefined) {
        var self = this;
        var syncedData = {};
        var checkNewData = {};
        

        
        if (payload) {
            syncedData = payload;
        } else {
            try {
                syncedData = await this.env.services.rpc({
                    model: 'pos.session',
                    method: 'load_sync_latest_data',
                    args: [[odoo.pos_session_id], this.db.sync_date],
                });
            } catch (error) {
                console.log(error);
                return;
            }
        }

        this.remove_server_data(syncedData)

        
        const result = await this.env.services.rpc({
                    model: 'pos.session',
                    method: 'load_loyalty_data',
                    args: [[odoo.pos_session_id]],
                });
        const rews = result['loyalty.reward'] || [];

        for (const reward of rews) {
            // reward.all_discount_product_ids = new Set(reward.all_discount_product_ids);
            if (Array.isArray(reward.discount_line_product_id) && reward.discount_line_product_id.length) {
                const prod = this.db.get_product_by_id(reward.discount_line_product_id[0]);
                if (!prod) {
                
                var syncedData2 = await this.env.services.rpc({
                                model: 'pos.session',
                                method: 'load_sync_reward_product',
                                args: [[odoo.pos_session_id], reward.discount_line_product_id[0]],
                            });
                
                if(syncedData['product.product']){
                    // Clone the existing array
                    syncedData['product.product'] = [...syncedData2['product.product']];

                    // Add a new product (example)
                    

                    // syncedData['product.product'].push(product[0]);
                    // this.loadedData['product.product'].add(product[0])
                }
                }
            }
        }

        


        var updateLoyalty = false;
        for (const id in syncedData['product_id_to_program_ids']) {
            updateLoyalty = true;
            this.productId2ProgramIds[id] = syncedData['product_id_to_program_ids'][id];
        }
        if (syncedData['loyalty.program'] && syncedData['loyalty.program'].remove) {
            var indexes = [];
            this.programs.forEach((program, i) => {
                if (syncedData['loyalty.program'].remove.includes(program.id)) {
                    indexes.push(i);
                    this.program_by_id[program.id] = undefined;
                }
            });
            for (const index of indexes) {
                this.programs.splice(index, 1);
            }
        } else {
            for (const idProg in syncedData['loyalty.program']) {
                const prog = syncedData['loyalty.program'][parseInt(idProg)];
                updateLoyalty = true;

                this.programs.forEach((program, i) => {
                    if (program.id == prog.id) {
                        self.programs[i] = prog;
                    }
                });

                const existing_program = this.programs.filter(program => program.id == prog.id);
                if (!existing_program || !existing_program.length) {
                    this.programs.push(prog);
                }
            }
        }
        if (syncedData['loyalty.rule'] && syncedData['loyalty.rule'].remove) {
            var indexes = [];
            this.rules.forEach((rule, i) => {
                if (syncedData['loyalty.rule'].remove.includes(rules.id)) {
                    indexes.push(i);
                    this.rule_by_id[rule.id] = undefined;
                }
            });
            for (const index of indexes) {
                this.rules.splice(index, 1);
            }
        } else {
            for (const idRl in syncedData['loyalty.rule']) {
                const rl = syncedData['loyalty.rule'][parseInt(idRl)];
                updateLoyalty = true;
                this.rules.forEach((rule, i) => {
                    if (rule.id == rl.id) {
                        self.rules[i] = rl;
                    }
                });


                const existing_rule = this.rules.filter(rule => rule.id == rl.id);
                if (!existing_rule || !existing_rule.length) {
                    this.rules.push(rl)
                }
            }
        }
        if (syncedData['loyalty.reward'] && syncedData['loyalty.reward'].remove) {
            var indexes = [];
            this.rewards.forEach((reward, i) => {
                if (syncedData['loyalty.reward'].remove.includes(rewards.id)) {
                    indexes.push(i);
                    this.reward_by_id[reward.id] = undefined;
                }
            });
            for (const index of indexes) {
                this.rewards.splice(index, 1);
            }
        } else {
            for (const idRd in syncedData['loyalty.reward']) {
                const rd = syncedData['loyalty.reward'][parseInt(idRd)];
                if (!rd.all_discount_product_ids) {
                    rd.all_discount_product_ids = new Set();
                }
                updateLoyalty = true;
                this.rewards.forEach((reward, i) => {
                    if (!reward.all_discount_product_ids) {
                        reward.all_discount_product_ids = new Set();
                    }
                    if (reward.id == rd.id) {
                        self.rewards[i] = rd;
                    }
                });


                const existing_reward = this.rewards.filter(reward => reward.id == rd.id);
                if (!existing_reward || !existing_reward.length) {
                    this.rewards.push(rd);
                }
            }
        }
        if (syncedData['product.product']) {
            this._loadProductProduct(syncedData['product.product']);
            updateLoyalty = true;
        }
        if (updateLoyalty) {
            this.updateLoyaltyData();
        }
        this.db.sync_date = moment().utc().format("YYYY-MM-DD hh:mm:ss");
    }

    async updateLoyaltyData() {
        for (const program of this.programs) {
            this.program_by_id[program.id] = program;
            if (program.date_to) {
                program.date_to = new Date(program.date_to);
            }
            if (!program.rules) {
                program.rules = [];
            }
            if (!program.rewards) {
                program.rewards = [];
            }

        }
        for (const rule of this.rules) {
            rule.valid_product_ids = new Set(rule.valid_product_ids);
            if (rule.program_id !== undefined && rule.program_id.length) {
                const tempProgram = this.program_by_id[rule.program_id[0]];
                if (tempProgram) {
                    rule.program_id = this.program_by_id[rule.program_id[0]];
                }
            } else if (rule.program_id && this.program_by_id[rule.program_id.id]) {
                rule.program_id = this.program_by_id[rule.program_id.id];
            }
            if (rule.program_id !== undefined && rule.program_id.id) {

                if (!rule.program_id.rules) {
                    rule.program_id.rules = [];
                }
                if (!rule.program_id.rules.length) {
                    rule.program_id.rules.push(rule);
                } else {
                    var ruleFound = false;
                    rule.program_id.rules.forEach((rl, i) => {
                        if (rl.id == rule.id) {
                            ruleFound = true;
                            rule.program_id.rules[i] = rule;
                        }
                    });
                    if (!ruleFound) {
                        rule.program_id.rules.push(rule);
                    }

                }
            }

        }
        for (const reward of this.rewards) {
            this.reward_by_id[reward.id] = reward
            if (reward.program_id !== undefined && reward.program_id.length) {
                const tempProgram = this.program_by_id[reward.program_id[0]];
                if (tempProgram) {
                    reward.program_id = this.program_by_id[reward.program_id[0]];
                }
            } else if (reward.program_id && this.program_by_id[reward.program_id.id]) {
                reward.program_id = this.program_by_id[reward.program_id.id];
            }
            if (reward.program_id != undefined && reward.program_id.id) {
                if (reward.discount_line_product_id && reward.discount_line_product_id.length) {
                    const prod = this.db.get_product_by_id(reward.discount_line_product_id[0]);
                    if (prod) {
                        reward.discount_line_product_id = this.db.get_product_by_id(reward.discount_line_product_id[0]);
                    } else {
                        try {
                            var syncedData = await this.env.services.rpc({
                                model: 'pos.session',
                                method: 'load_sync_reward_product',
                                args: [[odoo.pos_session_id], reward.discount_line_product_id[0]],
                            });
                            if (syncedData['product.product']) {
                                this._loadProductProduct(syncedData['product.product']);
                                const newProd = this.db.get_product_by_id(reward.discount_line_product_id[0]);
                                if (newProd) {
                                    reward.discount_line_product_id = newProd;
                                }
                            }
                        } catch (error) {
                            console.log(error);
                        }
                    }

                }
                reward.all_discount_product_ids = new Set(reward.all_discount_product_ids);

                if (!reward.program_id.rewards) {
                    reward.program_id.rewards = [];
                }
                if (!reward.program_id.rewards.length) {
                    reward.program_id.rewards.push(reward);
                } else {
                    var rewardFound = false;
                    reward.program_id.rewards.forEach((rd, i) => {
                        if (rd.id == reward.id) {
                            rewardFound = true;
                            reward.program_id.rewards[i] = reward;
                        }
                    });
                    if (!rewardFound) {
                        reward.program_id.rewards.push(reward);
                    }

                }
            }
        }
        if (this.selectedOrder) {
            await this.selectedOrder._updateLoyaltyPrograms();
            this.selectedOrder._resetPrograms();
        }
    }
    compute_discount_product_ids(reward, products) {
        const reward_product_domain = JSON.parse(reward.reward_product_domain);
        if (!reward_product_domain || !reward_product_domain.length) {
            return;
        }
        if (reward && (!reward.all_discount_product_ids || !reward.all_discount_product_ids.size)) {
            reward.all_discount_product_ids = new Set();
        }
        const domain = new Domain(reward_product_domain);

        try {
            products
                .filter((product) => domain.contains(product))
                .forEach(product => reward.all_discount_product_ids.add(product.id));
        } catch (error) {
            if (!(error instanceof InvalidDomainError)) {
                throw error
            }
            const index = this.rewards.indexOf(reward);
            if (index != -1) {
                Gui.showPopup('ErrorPopup', {
                    title: _t('A reward could not be loaded'),
                    body: sprintf(
                        _t('The reward "%s" contain an error in its domain, your domain must be compatible with the PoS client'),
                        this.rewards[index].description)
                });
                this.rewards[index] = null;
            }
        }
    }

}
Registries.Model.extend(PosGlobalState, PosUpdaterState);