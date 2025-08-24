odoo.define('pos_loyalty_polling.pos_polling', function (require) {
    "use strict";

    const { PosGlobalState, Product } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');
    const { Domain, InvalidDomainError } = require('@web/core/domain');


 const PosPollingLoyalty = (PosGlobalState) => class extends PosGlobalState {




        constructor(obj) {
            super(obj);
            this._startLoyaltyPolling();
        }


        async _processData(loadedData) {
            super._processData(loadedData);
            this.loadedData = loadedData

        }

       

        async load_server_loyalty_data() {
            const loadedData = await this.env.services.rpc({
                model: 'pos.session',
                method: 'load_pos_loyalty_data',
                args: [[odoo.pos_session_id]],
            });

            return loadedData;

        }

        _startLoyaltyPolling() {
             this._rewardInterval = setInterval(async () => {
                    try {
                        const result = await this.load_server_loyalty_data();
                        // console.log(result)
                        this.rewards = result['loyalty.reward'] || [];

                        for (const reward of this.rewards) {
                            reward.all_discount_product_ids = new Set(reward.all_discount_product_ids);
                        }
                        this.programs = result['loyalty.program'] || []; //TODO: rename to `loyaltyPrograms` etc
                        this.rules = result['loyalty.rule'] || [];
                        if(this.loadedData){
                            // console.log(this.loadedData['product.product'])
                            this._loadProductProduct2(this.loadedData['product.product']);
                            this._loadLoyaltyData();
                        }
                        
                    // console.log(result);s
                    } catch (err) {
                        console.error("Error fetching coupons:", err);
                    }
                }, 5000);
        }

       
        
        
            _loadProductProduct2(products) {
                this._loadProductProduct(...arguments);
        
                for (const reward of this.rewards) {
                        this.compute_discount_product_ids(reward, products);
                
                      
                }
        
                // this.rewards = this.rewards.filter(Boolean)
            }



            destroy() {
                if (this._rewardInterval) {
                    clearInterval(this._rewardInterval);
                    this._rewardInterval = null;
                }
                super.destroy();
            }
        
           
       };

    Registries.Model.extend(PosGlobalState, PosPollingLoyalty);

    

});