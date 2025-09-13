odoo.define('pos_loyalty_polling.pos_orderline', function (require) {
    "use strict";

    const { Orderline } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

  
   
   

    const PosPollingLoyaltyOrderline = (Orderline) => class extends Orderline {

        constructor(obj, options) {
            super(obj, options);
        }

        set_product_lot(product){
                if(this.product){
                    this.has_product_lot = product.tracking !== 'none';
                    this.pack_lot_lines  = this.has_product_lot && new PosCollection();
                }
                
        }

        // return the unit of measure of the product
        get_unit(){
            if(this.product){
                return this.product.get_unit();
            }
            return null;
            
        }


        set_quantity(quantity, keep_price) {
            if(this.product){
                return super.set_quantity(...arguments);
            } 
            
        }

        


        

        


        };



    Registries.Model.extend(Orderline, PosPollingLoyaltyOrderline);
});

   