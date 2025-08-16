odoo.define('pos_loyalty_polling.pos_polling', function (require) {
    "use strict";

    const { PosGlobalState } = require('point_of_sale.models');
    const Registries = require('point_of_sale.Registries');

  
   
   PosGlobalState.include({
    
        constructor(obj) {
            PosGlobalState(obj);
            this._startLoyaltyPolling();
        },
        async _processData(loadedData) {
        this.couponCache = {};
        this.partnerId2CouponIds = {};
        this.rewards = loadedData['loyalty.reward'] || [];

        for (const reward of this.rewards) {
            reward.all_discount_product_ids = new Set(reward.all_discount_product_ids);
        }

        this.fieldTypes = loadedData['field_types'];
        await PosGlobalState._processData(loadedData);
        this.productId2ProgramIds = loadedData['product_id_to_program_ids'];
        this.programs = loadedData['loyalty.program'] || []; //TODO: rename to `loyaltyPrograms` etc
        this.rules = loadedData['loyalty.rule'] || [];
        this._loadLoyaltyData();
    },


        async load_server_loyalty_data() {
            const loadedData = await this.env.services.rpc({
                model: 'pos.session',
                method: 'load_pos_loyalty_data',
                args: [[odoo.pos_session_id]],
            });

            return loadedData;

        },

        _startLoyaltyPolling() {
             setInterval(async () => {
                    try {
                        const result = await this.load_server_loyalty_data();
                        console.log(result)
                        this.rewards = result['loyalty.reward'] || [];

                        for (const reward of this.rewards) {
                            reward.all_discount_product_ids = new Set(reward.all_discount_product_ids);
                        }
                        // await this.env.services.rpc({
                        //     model: 'loyalty.reward',
                        //     method: 'compute_all_discount_product_ids',
                        // });
                        this.programs = result['loyalty.program'] || []; //TODO: rename to `loyaltyPrograms` etc
                        this.rules = result['loyalty.rule'] || [];
                        this._loadProductProduct2(this.loadedData['product.product']);
                        this._loadLoyaltyData();
                    // console.log(result);s
                    } catch (err) {
                        console.error("Error fetching coupons:", err);
                    }
                }, 5000);
        },

        _loadProductProduct(products) {
                PosGlobalState._loadProductProduct(...arguments);
        
                for (const reward of this.rewards) {
                    this.compute_discount_product_ids(reward, products);
                }
        
                this.rewards = this.rewards.filter(Boolean)
            },
        
            _loadProductProduct2(products) {
                // super._loadProductProduct(...arguments);
        
                for (const reward of this.rewards) {
                        this.compute_discount_product_ids(reward, products);
                
                      
                }
        
                // this.rewards = this.rewards.filter(Boolean)
            },
        
            compute_discount_product_ids(reward, products) {
                const reward_product_domain = JSON.parse(reward.reward_product_domain);
                if (!reward_product_domain) {
                    return;
                }
        
                const domain = new Domain(reward_product_domain);
        
                try {
                    products
                        .filter((product) => domain.contains(product))
                        .forEach(product => reward.all_discount_product_ids.add(product.id));
                } catch (error) {
                    if (!(error instanceof InvalidDomainError)) {
                        throw error
                    }
                    const index = this.rewards.indexOf(reward);
                    if (index != -1) {
                        Gui.showPopup('ErrorPopup', {
                            title: _t('A reward could not be loaded'),
                            body:  sprintf(
                                _t('The reward "%s" contain an error in its domain, your domain must be compatible with the PoS client'),
                                this.rewards[index].description)
                            });
                        this.rewards[index] = null;
                    }
                }
            },
        
            async _getTableOrdersFromServer(tableIds) {
                const oldOrders = this.orders;
                const orders = await PosGlobalState._getTableOrdersFromServer(tableIds);
        
                const oldOrderlinesWithCoupons = [].concat(...oldOrders.map(oldOrder =>
                    oldOrder.orderlines.filter(orderline => orderline.is_reward_line && orderline.coupon_id < 1)
                ));
        
                // Remapping of coupon_id for both couponPointChanges and Orderline.coupon_id
                if (oldOrderlinesWithCoupons.length) {
                    for (const oldOrderline of oldOrderlinesWithCoupons) {
                        const matchingOrderline = orders
                            .flatMap((order) => order.lines.map((line) => line[2]))
                            .find(line => line.reward_id === oldOrderline.reward_id);
        
                        if (matchingOrderline) {
                            matchingOrderline.coupon_id = nextId;
                        }
                    }
        
                    for (const order of orders) {
                        const oldOrder = oldOrders.find(oldOrder => oldOrder.uid === order.uid);
        
                        if (oldOrder) {
                            if (oldOrder.partner && oldOrder.partner.id === order.partner_id) {
                                order.partner = oldOrder.partner;
                            }
        
                            order.couponPointChanges = oldOrder.couponPointChanges;
        
                            Object.keys(order.couponPointChanges).forEach(index => {
                                order.couponPointChanges[nextId] = {...order.couponPointChanges[index]};
                                order.couponPointChanges[nextId].coupon_id = nextId;
                                delete order.couponPointChanges[index];
                            });
                        }
                    }
                }
        
                return orders;
            },
        
            _loadLoyaltyData() {
                console.log("override _loadLoyaltyData")
                this.program_by_id = {};
                this.reward_by_id = {};
        
                for (const program of this.programs) {
                    this.program_by_id[program.id] = program;
                    if (program.date_to) {
                        program.date_to = new Date(program.date_to);
                    }
                    program.rules = [];
                    program.rewards = [];
                }
                for (const rule of this.rules) {
                    rule.valid_product_ids = new Set(rule.valid_product_ids);
                    rule.program_id = this.program_by_id[rule.program_id[0]];
                    rule.program_id.rules.push(rule);
                }
                for (const reward of this.rewards) {
                    // console.log(reward.all_discount_product_ids)
                    this.reward_by_id[reward.id] = reward
                    reward.program_id = this.program_by_id[reward.program_id[0]];;
                    reward.discount_line_product_id = this.db.get_product_by_id(reward.discount_line_product_id[0]);
                    reward.all_discount_product_ids = new Set(reward.all_discount_product_ids);
                    reward.program_id.rewards.push(reward);
                }
            },
            async load_server_data() {
                await PosGlobalState.load_server_data(...arguments);
                if (this.selectedOrder) {
                    this.selectedOrder._updateRewards();
                }
            },
            set_order(order) {
                const result = PosGlobalState.set_order(...arguments);
                // FIXME - JCB: This is a temporary fix.
                // When an order is selected, it doesn't always contain the reward lines.
                // And the list of active programs are not always correct. This is because
                // of the use of DropPrevious in _updateRewards.
                if (order && !order.finalized) {
                    order._updateRewards();
                }
                return result;
            },
            /**
             * Fetches `loyalty.card` records from the server and adds/updates them in our cache.
             *
             * @param {domain} domain For the search
             * @param {int} limit Default to 1
             */
            async fetchCoupons(domain, limit=1) {
                const result = await this.env.services.rpc({
                    model: 'loyalty.card',
                    method: 'search_read',
                    kwargs: {
                        domain: domain,
                        fields: ['id', 'points', 'code', 'partner_id', 'program_id', 'expiration_date'],
                        limit: limit,
                        context: session.user_context,
                    }
                });
                if (Object.keys(this.couponCache).length + result.length > COUPON_CACHE_MAX_SIZE) {
                    this.couponCache = {};
                    this.partnerId2CouponIds = {};
                    // Make sure that the current order has no invalid data.
                    if (this.selectedOrder) {
                        this.selectedOrder.invalidCoupons = true;
                    }
                }
                const couponList = [];
                for (const dbCoupon of result) {
                    const coupon = new PosLoyaltyCard(dbCoupon.code, dbCoupon.id, dbCoupon.program_id[0], dbCoupon.partner_id[0], dbCoupon.points, dbCoupon.expiration_date);
                    this.couponCache[coupon.id] = coupon;
                    this.partnerId2CouponIds[coupon.partner_id] = this.partnerId2CouponIds[coupon.partner_id] || new Set();
                    this.partnerId2CouponIds[coupon.partner_id].add(coupon.id);
                    couponList.push(coupon);
                }
                return couponList;
            },
            /**
             * Fetches a loyalty card for the given program and partner, put in cache afterwards
             *  if a matching card is found in the cache, that one is used instead.
             * If no card is found a local only card will be created until the order is validated.
             *
             * @param {int} programId
             * @param {int} partnerId
             */
            async fetchLoyaltyCard(programId, partnerId) {
                for (const coupon of Object.values(this.couponCache)) {
                    if (coupon.partner_id === partnerId && coupon.program_id === programId) {
                        return coupon;
                    }
                }
                const fetchedCoupons = await this.fetchCoupons([['partner_id', '=', partnerId], ['program_id', '=', programId]]);
                const dbCoupon = fetchedCoupons.length > 0 ? fetchedCoupons[0] : null;
                return dbCoupon || new PosLoyaltyCard(null, null, programId, partnerId, 0);
            },
            getLoyaltyCards(partner) {
                const loyaltyCards = [];
                if (this.partnerId2CouponIds[partner.id]) {
                    this.partnerId2CouponIds[partner.id].forEach(couponId => loyaltyCards.push(this.couponCache[couponId]));
                }
                return loyaltyCards;
            },
            addPartners(partners) {
                const result = PosGlobalState.addPartners(partners);
                // cache the loyalty cards of the partners
                for (const partner of partners) {
                    for (const [couponId, { code, program_id, points }] of Object.entries(partner.loyalty_cards || {})) {
                        this.couponCache[couponId] = new PosLoyaltyCard(code, parseInt(couponId, 10), program_id, partner.id, points);
                        this.partnerId2CouponIds[partner.id] = this.partnerId2CouponIds[partner.id] || new Set();
                        this.partnerId2CouponIds[partner.id].add(couponId);
                    }
                }
                return result;
            }

   });

    

    

});