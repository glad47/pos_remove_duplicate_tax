/** @odoo-module **/
odoo.define('pos_remove_duplicate_tax.pos_orderline', function (require) {
    "use strict";

    const { Order } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

  
   
   

    const PosDuplicateTaxes =  (Order) => class PosDuplicateTaxes extends Order {

        _getDiscountableOnOrder(reward) {
                    let discountable = 0;
                    const discountablePerTax = {};

                    // Define target tax IDs based on reward type

                    const targetTaxIds = new Set();

                    for (const id of reward.program_id.trigger_product_ids) {
                        const product = this.pos.db.get_product_by_id(id);

                        if (product && Array.isArray(product.taxes_id)) {
                            for (const taxId of product.taxes_id) {
                                targetTaxIds.add(taxId);
                            }
                        }
                    }


                    for (const line of this.get_orderlines()) {
                        if (!line.get_quantity()) {
                            continue;
                        }

                        const lineTaxIds = ['ewallet', 'gift_card'].includes(reward.program_id.program_type)
                            ? line.get_taxes().map((t) => t.id)
                            : line.get_taxes().filter((t) => t.amount_type !== 'fixed').map((t) => t.id);

                        // Check if line's taxes intersect with target taxes
                        const hasRelevantTax = lineTaxIds.some(id => targetTaxIds.has(id));
                        if (!hasRelevantTax) {
                            continue; // skip this line
                        }

                        discountable += line.get_price_with_tax();

                        for (const taxId of lineTaxIds) {
                            if (!discountablePerTax[taxId]) {
                                discountablePerTax[taxId] = 0;
                            }
                            discountablePerTax[taxId] += line.get_base_price();
                        }
                    }

                    return { discountable, discountablePerTax };
                }
        


        };



    Registries.Model.extend(Order, PosDuplicateTaxes);
});

   