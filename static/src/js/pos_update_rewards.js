odoo.define('pos_loyalty_updating_reward.pos_polling', function (require) {
    "use strict";

    const { Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    const { qweb, _t }= require('web.core');
    const KeepUpdatingReward = (Order) =>
        class extends Order {
            constructor() {
                super(...arguments);
                // this._startRewardPolling();
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
            if (!args['product']){
                 console.log("i am here")
                 var rw = this.pos.reward_by_id[reward.id]
                 console.log(rw)
                 console.log(rw.all_discount_product_ids.values().next().value)
                 args['product'] = this.pos.db.get_product_by_id(rw.all_discount_product_ids.values().next().value);
                 console.log(args['product'])
            }
            if(args['product']){
                    const rewardLines = this._getRewardLineValues({
                    reward: reward,
                    coupon_id: coupon_id,
                    product: args['product'] || null,
                    });
                    if(rewardLines && rewardLines[0] && !rewardLines[0]['product']){
                        console.log("working working working working :) :)")
                        rewardLines[0]['product'] = args['product']
                    }
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



        };



    Registries.Model.extend(Order, KeepUpdatingReward);
});

   