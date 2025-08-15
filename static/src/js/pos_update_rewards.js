odoo.define('pos_loyalty_updating_reward.pos_polling', function (require) {
    "use strict";

    const { Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    const KeepUpdatingReward = (Order) =>
        class extends Order {
            constructor() {
                super(...arguments);
                // this._startRewardPolling();
            }

            _startRewardPolling() {
                setInterval(() => {
                //    this._updateRewards();
                }, 3000);
            }

            // _resetPrograms() {
            //     this.disabledRewards = new Set();
            //     this.codeActivatedProgramRules = [];
            //     this.codeActivatedCoupons = [];
            //     this.couponPointChanges = {};
            //     this.orderlines.remove(this._get_reward_lines());
            //     this._updateRewards();
            // }

//             _updateRewards() {
//                 // Calls are not expected to take some time besides on the first load + when loyalty programs are made applicable
//                 if (this.pos.programs.length === 0) {
//                     return;
//                 }
//                 this.dropPrevious.exec(() => {return this._updateLoyaltyPrograms().then(async () => {
//                     // Try auto claiming rewards
//                     const claimableRewards = this.getClaimableRewards(false, false, true);
//                     let changed = false;
//                     for (const {coupon_id, reward} of claimableRewards) {
//                         if (reward.program_id.rewards.length === 1 && !reward.program_id.is_nominative &&
//                             (reward.reward_type !== 'product' || (reward.reward_type == 'product' && !reward.multi_product))) {
//                             this._applyReward(reward, coupon_id);
//                             changed = true;
//                         }
//                     }
//                     // Rewards may impact the number of points gained
//                     if (changed) {
//                         await this._updateLoyaltyPrograms();
//                     }
//                     this._updateRewardLines();
//                 })}).catch(() => {/* catch the reject of dp when calling `add` to avoid unhandledrejection */});
//     }


//     _updateRewardLines() {
//         if (!this.orderlines.length) {
//             return;
//         }
//         const rewardLines = this._get_reward_lines();
//         if (!rewardLines.length) {
//             return;
//         }
//         const productRewards = []
//         const otherRewards = [];
//         const paymentRewards = []; // Gift card and ewallet rewards are considered payments and must stay at the end

//         for (const line of rewardLines) {
//             const claimedReward = {
//                 reward: this.pos.reward_by_id[line.reward_id],
//                 coupon_id: line.coupon_id,
//                 args: {
//                     product: line.reward_product_id,
//                 },
//                 reward_identifier_code: line.reward_identifier_code,
//             }
//             if (claimedReward.reward.program_id.program_type === 'gift_card' || claimedReward.reward.program_id.program_type === 'ewallet') {
//                 paymentRewards.push(claimedReward);
//             } else if (claimedReward.reward.reward_type === 'product') {
//                 productRewards.push(claimedReward);
//             } else if (!otherRewards.some(reward => reward.reward_identifier_code === claimedReward.reward_identifier_code)) {
//                 otherRewards.push(claimedReward);
//             }
//             this.orderlines.remove(line);
//         }
//         for (const claimedReward of productRewards.concat(otherRewards).concat(paymentRewards)) {
//             // For existing coupons check that they are still claimed, they can exist in either `couponPointChanges` or `codeActivatedCoupons`
//             if (!this.codeActivatedCoupons.find((coupon) => coupon.id === claimedReward.coupon_id) &&
//                 !this.couponPointChanges[claimedReward.coupon_id]) {
//                 continue;
//             }
//             this._applyReward(claimedReward.reward, claimedReward.coupon_id, claimedReward.args);
//         }
//     }


//     _applyReward(reward, coupon_id, args) {
//         if (this._getRealCouponPoints(coupon_id) < reward.required_points) {
//             return _t("There are not enough points on the coupon to claim this reward.");
//         }
//         if (reward.is_global_discount) {
//             const globalDiscountLines = this._getGlobalDiscountLines();
//             if (globalDiscountLines.length) {
//                 const rewardId = globalDiscountLines[0].reward_id;
//                 if (rewardId != reward.id && this.pos.reward_by_id[rewardId].discount >= reward.discount) {
//                     return _t("A better global discount is already applied.");
//                 } else if (rewardId != rewardId.id) {
//                     for (const line of globalDiscountLines) {
//                         this.orderlines.remove(line);
//                     }
//                 }
//             }
//         }
//         args = args || {};
//         const rewardLines = this._getRewardLineValues({
//             reward: reward,
//             coupon_id: coupon_id,
//             product: args['product'] || null,
//         });
//         if (!Array.isArray(rewardLines)) {
//             return rewardLines; // Returned an error.
//         }
//         if (!rewardLines.length) {
//             return _t("The reward could not be applied.");
//         }
//         for (const rewardLine of rewardLines) {
//             this.orderlines.add(this._createLineFromVals(rewardLine));
//         }
//         return true;
//     }


//      _getGlobalDiscountLines() {
//         return this.get_orderlines().filter((line) => line.reward_id && this.pos.reward_by_id[line.reward_id].is_global_discount);
//     }
            
//             async _updatePrograms() {
//                 console.log("hereherhe")
//                     const changesPerProgram = {};
//                     const programsToCheck = new Set();
//                     // By default include all programs that are considered 'applicable'
//                     for (const program of this.pos.programs) {
//                         if (this._programIsApplicable(program)) {
//                             programsToCheck.add(program.id);
//                         }
//                     }
//                     const newPointChanges = Object.assign({}, JSON.parse(JSON.stringify(this.couponPointChanges)));
//                     for (const pe of Object.values(newPointChanges)) {
//                         if (!changesPerProgram[pe.program_id]) {
//                             changesPerProgram[pe.program_id] = [];
//                             programsToCheck.add(pe.program_id);
//                         }
//                         changesPerProgram[pe.program_id].push(pe);
//                     }
//                     for (const coupon of this.codeActivatedCoupons) {
//                         programsToCheck.add(coupon.program_id);
//                     }
//                     const programs = [...programsToCheck]
//                         .map((programId) => this.pos.program_by_id[programId])
//                         .filter((program) => program != null);

//                     const pointsAddedPerProgram = this.pointsForPrograms(programs);
//                     for (const program of this.pos.programs) {
//                         // Future programs may split their points per unit paid (gift cards for example), consider a non applicable program to give no points
//                         const pointsAdded = this._programIsApplicable(program) ? pointsAddedPerProgram[program.id] : [];
//                         // For programs that apply to both (loyalty) we always add a change of 0 points, if there is none, since it makes it easier to
//                         //  track for claimable rewards, and makes sure to load the partner's loyalty card.
//                         if (program.is_nominative && !pointsAdded.length && this.get_partner()) {
//                             pointsAdded.push({points: 0});
//                         }
//                         const oldChanges = changesPerProgram[program.id] || [];
//                         // Update point changes for those that exist
//                         for (let idx = 0; idx < Math.min(pointsAdded.length, oldChanges.length); idx++) {
//                             Object.assign(oldChanges[idx], pointsAdded[idx]);
//                         }
//                         if (pointsAdded.length < oldChanges.length) {
//                             const removedIds = oldChanges.map((pe) => pe.coupon_id);
//                             removedIds.forEach(id => delete newPointChanges[id]);
//                         } else if (pointsAdded.length > oldChanges.length) {
//                             for (const pa of pointsAdded.splice(oldChanges.length)) {
//                                 const coupon = await this._couponForProgram(program);
//                                 newPointChanges[coupon.id] = {
//                                     points: pa.points,
//                                     program_id: program.id,
//                                     coupon_id: coupon.id,
//                                     barcode: pa.barcode,
//                                     appliedRules: pointsForProgramsCountedRules[program.id],
//                                     giftCardId: pa.giftCardId
//                                 };
//                             }
//                         }
//                     }
//                     // Also remove coupons from codeActivatedCoupons if their program applies_on current orders and the program does not give any points
//                     this.codeActivatedCoupons = this.codeActivatedCoupons.filter((coupon) => {
//                         const program = this.pos.program_by_id[coupon.program_id];
//                         if(program){
//                             if (program.applies_on === 'current' && pointsAddedPerProgram[program.id].length === 0) {
//                             return false;
//                         }
//                         }
                        
//                         return true;
//                     });
//         this.couponPointChanges = newPointChanges;
//          }


//           async _updateLoyaltyPrograms() {
//             console.log("override _updateLoyaltyPrograms")
//             await this._checkMissingCoupons();
//             await this._updatePrograms();
//         }


//          getLoyaltyPoints() {
//         // map: couponId -> LoyaltyPoints
//         const loyaltyPoints = {};
//         for (const pointChange of Object.values(this.couponPointChanges)) {
//             const { coupon_id, points, program_id } = pointChange;
//             const program = this.pos.program_by_id[program_id];
//             if(program){
//                 if (program.program_type !== 'loyalty') {
//                     // Not a loyalty program, skip
//                     continue;
//                 }
//                 const loyaltyCard = this.pos.couponCache[coupon_id] || /* or new card */ { id: coupon_id, balance: 0 };
//                 let [won, spent, total] = [0, 0, 0];
//                 let balance = loyaltyCard.balance;
//                 won += points - this._getPointsCorrection(program);
//                 if (coupon_id !== 0) {
//                     for (const line of this._get_reward_lines()) {
//                         if (line.coupon_id === coupon_id) {
//                             spent += line.points_cost;
//                         }
//                     }
//                 }
//                 total = balance + won - spent;
//                 const name = program.portal_visible ? program.portal_point_name : _t('Points');
//                 loyaltyPoints[coupon_id] = {
//                     won: parseFloat(won.toFixed(2)),
//                     spent: parseFloat(spent.toFixed(2)),
//                     // Display total when order is ongoing.
//                     total: parseFloat(total.toFixed(2)),
//                     // Display balance when order is done.
//                     balance: parseFloat(balance.toFixed(2)),
//                     name,
//                     program,
//                 };
//             }
            
//         }
//         return Object.entries(loyaltyPoints).map(([couponId, points]) => ({ couponId, points, program: points.program }));
//     }

//     _getRealCouponPoints(coupon_id) {
//     let points = 0;
//     console.log(`🔍 Checking real coupon points for coupon_id: ${coupon_id}`);

//     const dbCoupon = this.pos.couponCache[coupon_id];
//     if (dbCoupon) {
//         console.log(`✅ Found coupon in cache with balance: ${dbCoupon.balance}`);
//         points += dbCoupon.balance;
//     } else {
//         console.warn(`⚠️ Coupon not found in cache`);
//     }

//     const changes = Object.values(this.couponPointChanges);
//     console.log(`🔄 Checking ${changes.length} coupon point changes...`);

//     changes.some((pe) => {
//         console.log(`➡️ Evaluating change:`, pe);
//         if (pe.coupon_id === coupon_id) {
//             const program = this.pos.program_by_id[pe.program_id];
//             if(program){
//                 if (program.applies_on !== 'future') {
//                     console.log(`➕ Adding points from change: ${pe.points}`);
//                     points += pe.points;
//                 } else {
//                     console.log(`⏭️ Skipping future program`);
//                 }
//             }
            
//             return true; // Stop iteration
//         }
//         return false;
//     });

//     const orderlines = this.get_orderlines();
//     console.log(`🧾 Checking ${orderlines.length} order lines for reward deductions...`);

//     for (const line of orderlines) {
//         if (line.is_reward_line && line.coupon_id === coupon_id) {
//             console.log(`➖ Deducting reward line cost: ${line.points_cost}`);
//             points -= line.points_cost;
//         }
//     }

//     console.log(`✅ Final calculated points for coupon ${coupon_id}: ${points}`);
//     return points;
// }


// pointsForPrograms(programs) {
//         pointsForProgramsCountedRules = {};
//         const orderLines = this.get_orderlines().filter((line) => !line.refunded_orderline_id);
//         const linesPerRule = {};
//         for (const line of orderLines) {
//             const reward = line.reward_id
//               ? this.pos.reward_by_id[line.reward_id]
//               : undefined;
//             const isDiscount = reward && reward.reward_type === "discount";
//             const rewardProgram = reward && reward.program_id;
//             // Skip lines for automatic discounts.
//             if (isDiscount && rewardProgram.trigger === 'auto') {
//                 continue;
//             }
//             for (const program of programs) {
//                 if(program){
//                     // Skip lines for the current program's discounts.
//                                     if (isDiscount && rewardProgram.id === program.id) {
//                                         continue;
//                                     }
//                                     for (const rule of program.rules) {
//                                         // Skip lines to which the rule doesn't apply.
//                                         if (rule.any_product || rule.valid_product_ids.has(line.get_product().id)) {
//                                             if (!linesPerRule[rule.id]) {
//                                                 linesPerRule[rule.id] = [];
//                                             }
//                                             linesPerRule[rule.id].push(line);
//                                         }
//                                     }
//                 }
                
//             }
//         }
//         const result = {}
//         for (const program of programs) {
//                 if(program){
// let points = 0;
//             const splitPoints = [];
//             for (const rule of program.rules) {
//                 if (rule.mode === 'with_code' && !this.codeActivatedProgramRules.includes(rule.id)) {
//                     continue;
//                 }
//                 const linesForRule = linesPerRule[rule.id] ? linesPerRule[rule.id] : [];
//                 const amountWithTax = linesForRule.reduce((sum, line) => sum + line.get_price_with_tax(), 0);
//                 const amountWithoutTax = linesForRule.reduce((sum, line) => sum + line.get_price_without_tax(), 0);
//                 const amountCheck = rule.minimum_amount_tax_mode === 'incl' && amountWithTax || amountWithoutTax;
//                 if (rule.minimum_amount > amountCheck) {
//                     continue;
//                 }
//                 let totalProductQty = 0;
//                 // Only count points for paid lines.
//                 const qtyPerProduct = {};
//                 let orderedProductPaid = 0;
//                 for (const line of orderLines) {
//                     if (((!line.reward_product_id && (rule.any_product || rule.valid_product_ids.has(line.get_product().id))) ||
//                         (line.reward_product_id && (rule.any_product || rule.valid_product_ids.has(line.reward_product_id)))) &&
//                         !line.ignoreLoyaltyPoints({ program })){
//                         if (line.is_reward_line) {
//                             const reward = this.pos.reward_by_id[line.reward_id];
//                             if ((program.id === reward.program_id.id) || ['gift_card', 'ewallet'].includes(reward.program_id.program_type)) {
//                                 continue;
//                             }
//                         }
//                         const lineQty = (line.reward_product_id ? -line.get_quantity() : line.get_quantity());
//                         if (qtyPerProduct[line.reward_product_id || line.get_product().id]) {
//                             qtyPerProduct[line.reward_product_id || line.get_product().id] += lineQty;
//                         } else {
//                             qtyPerProduct[line.reward_product_id || line.get_product().id] = lineQty;
//                         }
//                         orderedProductPaid += line.get_price_with_tax();
//                         if(!line.is_reward_line){
//                             totalProductQty += lineQty;
//                         }
//                     }
//                 }
//                 if (totalProductQty < rule.minimum_qty) {
//                     // Should also count the points from negative quantities.
//                     // For example, when refunding an ewallet payment. See TicketScreen override in this addon.
//                     continue;
//                 }
//                 if (!(program.id in pointsForProgramsCountedRules)) {
//                     pointsForProgramsCountedRules[program.id] = [];
//                 }
//                 pointsForProgramsCountedRules[program.id].push(rule.id)
//                 if (program.applies_on === 'future' && rule.reward_point_split && rule.reward_point_mode !== 'order') {
//                     // In this case we count the points per rule
//                     if (rule.reward_point_mode === 'unit') {
//                         splitPoints.push(...Array.apply(null, Array(totalProductQty)).map((_) => {return {points: rule.reward_point_amount}}));
//                     } else if (rule.reward_point_mode === 'money') {
//                         for (const line of orderLines) {
//                             if (line.is_reward_line || !(rule.valid_product_ids.has(line.get_product().id)) || line.get_quantity() <= 0
//                                 || line.ignoreLoyaltyPoints({ program })) {
//                                 continue;
//                             }
//                             const pointsPerUnit = round_precision(rule.reward_point_amount * line.get_price_with_tax() / line.get_quantity(), 0.01);
//                             if (pointsPerUnit > 0) {
//                                 splitPoints.push(...Array.apply(null, Array(line.get_quantity())).map(() => {
//                                     if (line.giftBarcode && line.get_quantity() == 1) {
//                                         return {points: pointsPerUnit, barcode: line.giftBarcode, giftCardId: line.giftCardId };
//                                     }
//                                     return {points: pointsPerUnit}
//                                 }));
//                             }
//                         }
//                     }
//                 } else {
//                     // In this case we add on to the global point count
//                     if (rule.reward_point_mode === 'order') {
//                         points += rule.reward_point_amount;
//                     } else if (rule.reward_point_mode === 'money') {
//                         // NOTE: unlike in sale_loyalty this performs a round half-up instead of round down
//                         points += round_precision(rule.reward_point_amount * orderedProductPaid, 0.01);
//                     } else if (rule.reward_point_mode === 'unit') {
//                         points += rule.reward_point_amount * totalProductQty;
//                     }
//                 }
//             }
//             const res = (points || program.program_type === 'coupons') ? [{points}] : [];
//             if (splitPoints.length) {
//                 res.push(...splitPoints);
//             }
//             result[program.id] = res;
//                 }
            
//         }
//         return result;
//     }


//     getClaimableRewards(coupon_id=false, program_id=false, auto=false) {
//         const allCouponPrograms = Object.values(this.couponPointChanges).map((pe) => {
//             return {
//                 program_id: pe.program_id,
//                 coupon_id: pe.coupon_id,
//             };
//         }).concat(this.codeActivatedCoupons.map((coupon) => {
//             return {
//                 program_id: coupon.program_id,
//                 coupon_id: coupon.id,
//             };
//         }));
//         const result = [];
//         const totalWithTax = this.get_total_with_tax();
//         const totalWithoutTax = this.get_total_without_tax();
//         const totalIsZero = totalWithTax === 0;
//         const globalDiscountLines = this._getGlobalDiscountLines();
//         const globalDiscountPercent = globalDiscountLines.length ?
//             this.pos.reward_by_id[globalDiscountLines[0].reward_id].discount : 0;
//         for (const couponProgram of allCouponPrograms) {
//             const program = this.pos.program_by_id[couponProgram.program_id];
//             if(program){
//                 if (program.trigger == 'with_code') {
//                 // For coupon programs, the rules become conditions.
//                 // Points to purchase rewards will only come from the scanned coupon.
//                 if (!this._canGenerateRewards(program, totalWithTax, totalWithoutTax)) {
//                     continue;
//                 };
//             }
//             if ((coupon_id && couponProgram.coupon_id !== coupon_id) ||
//                 (program_id && couponProgram.program_id !== program_id)) {
//                 continue;
//             }
//             const points = this._getRealCouponPoints(couponProgram.coupon_id);
//             for (const reward of program.rewards) {
//                 if (points < reward.required_points) {
//                     continue;
//                 }
//                 // Skip if the reward program is of type 'coupons' and there is already an reward orderline linked to the current reward to avoid multiple reward apply
//                 if ((reward.program_id.program_type === 'coupons' && this.orderlines.find(((rewardline) => rewardline.reward_id === reward.id)))) {
//                     continue;
//                 }
//                 if (auto && this.disabledRewards.has(reward.id)) {
//                     continue;
//                 }
//                 // Try to filter out rewards that will not be claimable anyway.
//                 if (reward.is_global_discount && reward.discount <= globalDiscountPercent) {
//                     continue;
//                 }
//                 if (reward.reward_type === 'discount' && totalIsZero) {
//                     continue;
//                 }
//                 let potentialQty;
//                 if (reward.reward_type === 'product') {
//                     if(!reward.multi_product){
//                         const product = this.pos.db.get_product_by_id(reward.reward_product_ids[0]);
//                         potentialQty = this._computeUnclaimedFreeProductQty(reward, couponProgram.coupon_id, product, points);
//                     }
//                     if (!potentialQty || potentialQty <= 0) {
//                         continue;
//                     }
//                 }
//                 result.push({
//                     coupon_id: couponProgram.coupon_id,
//                     reward: reward,
//                     potentialQty
//                 });
//             }
//             }
            
//         }
//         return result;
//     }



//     getPotentialFreeProductRewards() {
//         const allCouponPrograms = Object.values(this.couponPointChanges).map((pe) => {
//             return {
//                 program_id: pe.program_id,
//                 coupon_id: pe.coupon_id,
//             };
//         }).concat(this.codeActivatedCoupons.map((coupon) => {
//             return {
//                 program_id: coupon.program_id,
//                 coupon_id: coupon.id,
//             };
//         }));
//         const result = [];
//         for (const couponProgram of allCouponPrograms) {
//             const program = this.pos.program_by_id[couponProgram.program_id];
//             if(program){
//             const points = this._getRealCouponPoints(couponProgram.coupon_id);
//             const hasLine = this.orderlines.filter(line => !line.is_reward_line).length > 0;
//             for (const reward of program.rewards.filter(reward => reward.reward_type == 'product')) {
//                 if (points < reward.required_points) {
//                     continue;
//                 }
//                 // Loyalty program (applies_on == 'both') should needs an orderline before it can apply a reward.
//                 const considerTheReward = program.applies_on !== 'both' || (program.applies_on == 'both' && hasLine);
//                 if (reward.reward_type === 'product' && considerTheReward) {
//                     let hasPotentialQty = true;
//                     let potentialQty;
//                     for (const productId of reward.reward_product_ids) {
//                         const product = this.pos.db.get_product_by_id(productId);
//                         potentialQty = this._computePotentialFreeProductQty(reward, product, points);
//                         if (potentialQty <= 0) {
//                             hasPotentialQty = false;
//                         }
//                     }
//                     if (hasPotentialQty) {
//                         result.push({
//                             coupon_id: couponProgram.coupon_id,
//                             reward: reward,
//                             potentialQty
//                         });
//                     }
//                 }
//             }
//             }
            
//         }
//         return result;
//     }

//     _getRealCouponPoints(coupon_id) {
//         let points = 0;
//         const dbCoupon = this.pos.couponCache[coupon_id];
//         if (dbCoupon) {
//             points += dbCoupon.balance;
//         }
//         Object.values(this.couponPointChanges).some((pe) => {
//             if (pe.coupon_id === coupon_id) {
//                 if(pethis.pos.program_by_id[pe.program_id]){
//                     if (this.pos.program_by_id[pe.program_id].applies_on !== 'future') {
//                                 points += pe.points;
//                         }
//                 // couponPointChanges is not supposed to have a coupon multiple times
//                 return true;
//                 }
                
//             }
//             return false
//         });
//         for (const line of this.get_orderlines()) {
//             if (line.is_reward_line && line.coupon_id === coupon_id) {
//                 points -= line.points_cost;
//             }
//         }
//         return points
//     }


//     async _updatePrograms() {
//         console.log("overri _updatePrograms")
//         const changesPerProgram = {};
//         const programsToCheck = new Set();
//         // By default include all programs that are considered 'applicable'
//         for (const program of this.pos.programs) {
//             if (this._programIsApplicable(program)) {
//                 programsToCheck.add(program.id);
//             }
//         }
//         const newPointChanges = Object.assign({}, JSON.parse(JSON.stringify(this.couponPointChanges)));
//         for (const pe of Object.values(newPointChanges)) {
//             if (!changesPerProgram[pe.program_id]) {
//                 changesPerProgram[pe.program_id] = [];
//                 programsToCheck.add(pe.program_id);
//             }
//             changesPerProgram[pe.program_id].push(pe);
//         }
//         for (const coupon of this.codeActivatedCoupons) {
//             programsToCheck.add(coupon.program_id);
//         }
//         const programs = [...programsToCheck]
//             .map(programId => this.pos.program_by_id[programId])
//             .filter(program => program != null);

//         const pointsAddedPerProgram = this.pointsForPrograms(programs);
//         for (const program of this.pos.programs) {
//             // Future programs may split their points per unit paid (gift cards for example), consider a non applicable program to give no points
//             const pointsAdded = this._programIsApplicable(program) ? pointsAddedPerProgram[program.id] : [];
//             // For programs that apply to both (loyalty) we always add a change of 0 points, if there is none, since it makes it easier to
//             //  track for claimable rewards, and makes sure to load the partner's loyalty card.
//             if (program.is_nominative && !pointsAdded.length && this.get_partner()) {
//                 pointsAdded.push({points: 0});
//             }
//             const oldChanges = changesPerProgram[program.id] || [];
//             // Update point changes for those that exist
//             for (let idx = 0; idx < Math.min(pointsAdded.length, oldChanges.length); idx++) {
//                 Object.assign(oldChanges[idx], pointsAdded[idx]);
//             }
//             if (pointsAdded.length < oldChanges.length) {
//                 const removedIds = oldChanges.map((pe) => pe.coupon_id);
//                 removedIds.forEach(id => delete newPointChanges[id]);
//             } else if (pointsAdded.length > oldChanges.length) {
//                 for (const pa of pointsAdded.splice(oldChanges.length)) {
//                     const coupon = await this._couponForProgram(program);
//                     newPointChanges[coupon.id] = {
//                         points: pa.points,
//                         program_id: program.id,
//                         coupon_id: coupon.id,
//                         barcode: pa.barcode,
//                         appliedRules: pointsForProgramsCountedRules[program.id],
//                         giftCardId: pa.giftCardId
//                     };
//                 }
//             }
//         }
//         // Also remove coupons from codeActivatedCoupons if their program applies_on current orders and the program does not give any points
//         this.codeActivatedCoupons = this.codeActivatedCoupons.filter((coupon) => {
//             const program = this.pos.program_by_id[coupon.program_id];
//             if (program.applies_on === 'current' && pointsAddedPerProgram[program.id].length === 0) {
//                 return false;
//             }
//             return true;
//         });
//         this.couponPointChanges = newPointChanges;
//     }






        };



    Registries.Model.extend(Order, KeepUpdatingReward);
});

   