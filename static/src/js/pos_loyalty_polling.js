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

     



        async load_sync_latest_data() {
            const loadedData = await this.env.services.rpc({
                model: 'pos.session',
                method: 'load_sync_latest_data',
                args: [[odoo.pos_session_id]],
            });

            return loadedData;

            }
            _startLoyaltyPolling() {
                this.previousRewards = [];
            this.previousRules = [];
            this.previousPrograms = [];

            this._rewardInterval = setInterval(async () => {
            try {

                
                await this.sync_server_data();

            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 5000); // Poll every 5 seconds

        }

       
       


        
        _syncLoyaltyChanges(newRewards, newRules, newPrograms) {
            const removedRewardIds = this._findRemovedIds(this.previousRewards, newRewards);
            const removedRuleIds = this._findRemovedIds(this.previousRules, newRules);
            const removedProgramIds = this._findRemovedIds(this.previousPrograms, newPrograms);

            const payload = {};
            if (removedRewardIds.length) payload['loyalty.reward'] = removedRewardIds;
            if (removedRuleIds.length) payload['loyalty.rule'] = removedRuleIds;
            if (removedProgramIds.length) payload['loyalty.program'] = removedProgramIds;

            if (Object.keys(payload).length) {
                this.remove_server_data(payload);
            }

            // You can also detect new additions and update accordingly
        }





       
        
        
           

            _findRemovedIds(oldList, newList) {
                const newIds = newList.map(item => item.id);
                return oldList
                    .filter(item => !newIds.includes(item.id))
                    .map(item => item.id);
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