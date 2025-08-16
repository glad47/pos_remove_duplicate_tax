odoo.define('pos_loyalty_polling.pos_orderline', function (require) {
    "use strict";

    const { Orderline } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

  
   
   

    const PosPollingLoyaltyOrderline = (Orderline) => class extends Orderline {

        constructor(obj, options) {
            super(obj, options);
        }

        // set_product_lot(product){
        //     console.log("xxxxxxxxxxxxxxxxxx")
        //         if(product){
        //             this.has_product_lot = product.tracking !== 'none';
        //             this.pack_lot_lines  = this.has_product_lot && new PosCollection();
        //         }
                
        // }

        // // return the unit of measure of the product
        // get_unit(){
        //     if(product){
        //         return this.product.get_unit();
        //     }
        //     return null;
            
        // }



        };



    Registries.Model.extend(Orderline, PosPollingLoyaltyOrderline);
});

   