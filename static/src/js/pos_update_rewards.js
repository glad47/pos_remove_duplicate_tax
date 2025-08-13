odoo.define('pos_loyalty_updating_reward.pos_polling', function (require) {
    "use strict";

    const { Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

    const KeepUpdatingReward = (Order) =>
        class extends Order {
            constructor() {
                super(...arguments);
                this._startRewardPolling();
            }

            _startRewardPolling() {
                setInterval(() => {
                    this._resetPrograms();
                }, 3000);
            }

        };

    Registries.Model.extend(Order, KeepUpdatingReward);
});

   