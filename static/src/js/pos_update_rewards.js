odoo.define('pos_loyalty_updating_reward.pos_polling', function (require) {
    "use strict";

    const { Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    const { qweb, _t }= require('web.core');
    const { round_decimals,round_precision } = require('web.utils');

    function _newRandomRewardCode() {
        return (Math.random() + 1).toString(36).substring(3);
    }

    const KeepUpdatingReward = (Order) =>
        class extends Order {
            constructor() {
                super(...arguments);
                // this._startRewardPolling();
            }


        _getRewardLineValues(args) {
            console.log("*****************************&&&&&&&&&&&&&&*****************")
            console.log(args)
            console.log("_getRewardLineValues")
            const reward = args['reward'];
            if(args['product']){
                if (reward.reward_type === 'discount') {
                                return this._getRewardLineValuesDiscount(args);
                            } else if (reward.reward_type === 'product') {
                                return this._getRewardLineValuesProduct(args);
                            }
            }
           
            // NOTE: we may reach this step if for some reason there is a free shipping reward
            return [];
        }    


        _applyReward(reward, coupon_id, args) {
            if (this._getRealCouponPoints(coupon_id) < reward.required_points) {
                return _t("There are not enough points on the coupon to claim this reward.");
            }
            if (reward.is_global_discount) {
                const globalDiscountLines = this._getGlobalDiscountLines();
                if (globalDiscountLines.length) {
                    const rewardId = globalDiscountLines[0].reward_id;
                    if (rewardId != reward.id && this.pos.reward_by_id[rewardId].discount >= reward.discount) {
                        return _t("A better global discount is already applied.");
                    } else if (rewardId != rewardId.id) {
                        for (const line of globalDiscountLines) {
                            this.orderlines.remove(line);
                        }
                    }
                }
            }
            args = args || {};
            var productx = null 
                if(reward.reward_type == "product"){
                    var rw = this.pos.reward_by_id[reward.id]
                    console.log("i am inside product...")
                    console.log(rw)
                    console.log(rw.reward_product_ids[0])
                    productx = rw.reward_product_ids[0];
                    args['product'] = productx
                    console.log("printing product")
                    console.log(args['product'])
                }else{
                    console.log("i am here")
                    var rw = this.pos.reward_by_id[reward.id]
                    console.log(rw)
                    console.log(rw.all_discount_product_ids.values().next().value)
                    productx = rw.all_discount_product_ids.values().next().value;
                    args['product'] = productx
                    console.log(args['product'])
                }
            if(args['product']){
                    const rewardLines = this._getRewardLineValues({
                    reward: reward,
                    coupon_id: coupon_id,
                    product: args['product'] || null,
                    });
                    


                    // if(rewardLines && rewardLines[0]  && typeof productx !== 'string' && typeof productx === 'number' ){
                    //     console.log("working working working working :) :)")
                    //     rewardLines[0]['product'] = productx
                    // }
                if (!Array.isArray(rewardLines)) {
                    return rewardLines; // Returned an error.
                }
                if (!rewardLines.length) {
                    return _t("The reward could not be applied.");
                }
                console.log("here my friend ....")
                console.log(rewardLines)
                for (const rewardLine of rewardLines) {
                    const reward = this.pos.reward_by_id[rewardLine.reward_id]
                    console.log("the reward object")
                    console.log(reward)
                    var check = false;
                    if(reward && reward.reward_type == "discount" ){
                        for(var i = 0; i < this.orderlines.length; i++){
                            if(this.orderlines[i].is_reward_line && this.orderlines[i].reward_id == rewardLine.reward_id){
                                check= true;
                                break
                            }
                        }
                    }
                    if(!check){
                        this.orderlines.add(this._createLineFromVals(rewardLine));
                    }
                
                
                }
            }
            
        return true;
       
    }

    //   _programIsApplicable(program) {
    //     if(program && program.rules){
    //         if (program.trigger === 'auto' && !program.rules.find((rule) => rule.mode === 'auto' || this.codeActivatedProgramRules.includes(rule.id))) {
    //             return false;
    //         }
    //         if (program.trigger === 'with_code' && !program.rules.find((rule) => this.codeActivatedProgramRules.includes(rule.id))) {
    //             return false;
    //         }
    //         if (program.is_nominative && !this.get_partner()) {
    //             return false;
    //         }
    //         if (program.date_to && program.date_to <= new Date()) {
    //             return false;
    //         }
    //         if (program.limit_usage && program.total_order_count >= program.max_usage) {
    //             return false;
    //         }
    //          return true;
    //     }
    //     return true
       
       
    // }

    //  _getRealCouponPoints(coupon_id) {
    //     let points = 0;
    //     const dbCoupon = this.pos.couponCache[coupon_id];
    //     if (dbCoupon) {
    //         points += dbCoupon.balance;
    //     }
    //     Object.values(this.couponPointChanges).some((pe) => {
    //         if (pe.coupon_id === coupon_id) {
    //             if(this.pos.program_by_id[pe.program_id]){
    //                 if (this.pos.program_by_id[pe.program_id].applies_on !== 'future') {
    //                     points += pe.points;
    //                 }
    //                 // couponPointChanges is not supposed to have a coupon multiple times
    //                 return true;
    //             }
                
    //         }
    //         return false
    //     });
    //     for (const line of this.get_orderlines()) {
    //         if (line.is_reward_line && line.coupon_id === coupon_id) {
    //             points -= line.points_cost;
    //         }
    //     }
    //     return points
    // }


    // _computeUnclaimedFreeProductQty(reward, coupon_id, product, remainingPoints) {
    //         console.log("next step ....")
    //         console.log(product)
    //         if (!product){
    //             return
    //         }
    //         let claimed = 0;
    //         let available = 0;
    //         let shouldCorrectRemainingPoints = false;
    //         for (const line of this.get_orderlines()) {
    //             if (reward.reward_product_ids.includes(product.id) && reward.reward_product_ids.includes(line.product.id)) {
    //                 if (this._get_reward_lines() == 0) {
    //                     if (line.get_product().id === product.id) {
    //                         available += line.get_quantity();
    //                     }
    //                 } else {
    //                     available += line.get_quantity();
    //                 }
    //             } else if (reward.reward_product_ids.includes(line.reward_product_id)) {
    //                 if (line.reward_id == reward.id ) {
    //                     remainingPoints += line.points_cost;
    //                     claimed += line.get_quantity();
    //                 } else {
    //                     shouldCorrectRemainingPoints = true;
    //                 }
    //             }
    //         }
    //         let freeQty;
    //         if (reward.program_id.trigger == 'auto') {
    //             if (this._isRewardProductPartOfRules(reward, product) && reward.program_id.applies_on !== 'future') {
    //                 // OPTIMIZATION: Pre-calculate the factors for each reward-product combination during the loading.
    //                 // For points not based on quantity, need to normalize the points to compute free quantity.
    //                 const appliedRulesIds = this.couponPointChanges[coupon_id].appliedRules;
    //                 const appliedRules = appliedRulesIds !== undefined
    //                     ? reward.program_id.rules.filter(rule => appliedRulesIds.includes(rule.id))
    //                     : reward.program_id.rules;
    //                 let factor = 0;
    //                 let orderPoints = 0;
    //                 for (const rule of appliedRules) {
    //                     if (rule.any_product || rule.valid_product_ids.has(product.id)) {
    //                         if (rule.reward_point_mode === 'order') {
    //                             orderPoints += rule.reward_point_amount;
    //                         } else if (rule.reward_point_mode === 'money') {
    //                             factor += round_precision(rule.reward_point_amount * product.lst_price, 0.01);
    //                         } else if (rule.reward_point_mode === 'unit') {
    //                             factor += rule.reward_point_amount;
    //                         }
    //                     }
    //                 }
    //                 if (factor === 0) {
    //                     freeQty = Math.floor((remainingPoints / reward.required_points) * reward.reward_product_qty);
    //                 } else {
    //                     const correction = shouldCorrectRemainingPoints ? this._getPointsCorrection(reward.program_id) : 0
    //                     freeQty = computeFreeQuantity((remainingPoints - correction - orderPoints) / factor, reward.required_points / factor, reward.reward_product_qty);
    //                     freeQty += Math.floor((orderPoints / reward.required_points) * reward.reward_product_qty);
    //                 }
    //             } else {
    //                 freeQty = Math.floor((remainingPoints / reward.required_points) * reward.reward_product_qty);
    //             }
    //         } else if (reward.program_id.trigger == 'with_code') {
    //             freeQty = Math.floor((remainingPoints / reward.required_points) * reward.reward_product_qty);
    //         }
    //         return Math.min(available, freeQty) - claimed;
    //     }


    //      _getRewardLineValuesProduct(args) {
    //             const reward = args['reward'];
    //             const product = this.pos.db.get_product_by_id(args['product'] || reward.reward_product_ids[0]);
    //             if(!product){
    //                 return []
    //             }
    //             const points = this._getRealCouponPoints(args['coupon_id']);
    //             const unclaimedQty = this._computeUnclaimedFreeProductQty(reward, args['coupon_id'], product, points);
    //             if (unclaimedQty <= 0) {
    //                 return _t("There are not enough products in the basket to claim this reward.");
    //             }
    //             const claimable_count = reward.clear_wallet ? 1 : Math.min(Math.ceil(unclaimedQty / reward.reward_product_qty), Math.floor(points / reward.required_points));
    //             const cost = reward.clear_wallet ? points : claimable_count * reward.required_points;
    //             // In case the reward is the product multiple times, give it as many times as possible
    //             const freeQuantity = Math.min(unclaimedQty, reward.reward_product_qty * claimable_count);
    //             return [{
    //                 product: reward.discount_line_product_id,
    //                 price: -round_decimals(product.get_price(this.pricelist, freeQuantity), this.pos.currency.decimal_places),
    //                 tax_ids: product.taxes_id,
    //                 quantity: freeQuantity,
    //                 reward_id: reward.id,
    //                 is_reward_line: true,
    //                 reward_product_id: product.id,
    //                 coupon_id: args['coupon_id'],
    //                 points_cost: cost,
    //                 reward_identifier_code: _newRandomRewardCode(),
    //                 merge: false,
    //             }]
    //         }
            

        _getRewardLineValuesProduct(args) {
                console.log("_getRewardLineValuesProduct")
                const reward = args['reward'];
                console.log("&&&&&&&&&&&**************&&&&&&&&&&&&&&&&&&&&")
                console.log(reward.reward_product_ids)
                console.log(args['product'])
                const product = this.pos.db.get_product_by_id(args['product'] || reward.reward_product_ids[0]);
                if(product){
                    const points = this._getRealCouponPoints(args['coupon_id']);
                                    const unclaimedQty = this._computeUnclaimedFreeProductQty(reward, args['coupon_id'], product, points);
                                    if (unclaimedQty <= 0) {
                                        return _t("There are not enough products in the basket to claim this reward.");
                                    }
                                    const claimable_count = reward.clear_wallet ? 1 : Math.min(Math.ceil(unclaimedQty / reward.reward_product_qty), Math.floor(points / reward.required_points));
                                    const cost = reward.clear_wallet ? points : claimable_count * reward.required_points;
                                    // In case the reward is the product multiple times, give it as many times as possible
                                    const freeQuantity = Math.min(unclaimedQty, reward.reward_product_qty * claimable_count);
                                    return [{
                                        product: reward.discount_line_product_id,
                                        price: -round_decimals(product.get_price(this.pricelist, freeQuantity), this.pos.currency.decimal_places),
                                        tax_ids: product.taxes_id,
                                        quantity: freeQuantity,
                                        reward_id: reward.id,
                                        is_reward_line: true,
                                        reward_product_id: product.id,
                                        coupon_id: args['coupon_id'],
                                        points_cost: cost,
                                        reward_identifier_code: _newRandomRewardCode(),
                                        merge: false,
                                    }]
                }else{
                    console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx!!!!!!!!!!!!!! i am here")
                    return []
                }
                
            }
    



        };



    Registries.Model.extend(Order, KeepUpdatingReward);
});

   