odoo.define('pos_loyalty_polling.pos_polling', function (require) {
    "use strict";

    const { PosGlobalState } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

  
   
   

    const PosPollingLoyalty = (PosGlobalState) => class extends PosGlobalState {

        constructor(obj) {
            super(obj);
            this._startLoyaltyPolling();
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
             setInterval(async () => {
                    try {
                        const result = await this.load_server_loyalty_data();
                        // console.log(result)
                        this.rewards = result['loyalty.reward'] || [];
                        this.programs = result['loyalty.program'] || []; //TODO: rename to `loyaltyPrograms` etc
                        this.rules = result['loyalty.rule'] || [];
                        this._loadLoyaltyData();
                    // console.log(result);
                    } catch (err) {
                        console.error("Error fetching coupons:", err);
                    }
                }, 5000);
        }

        

        
    };

    Registries.Model.extend(PosGlobalState, PosPollingLoyalty);

});