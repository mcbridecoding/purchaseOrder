const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const e = require('express');
const { get } = require('lodash');
const pdfService = require('./public/javascript/pdfService');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const { parse } = require('csv-parse');
const fs = require('fs');
const multer = require('multer');

const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended:true }));
app.use(express.static('public'));

app.use(session({
    secret: 'Property of McBride Coding.',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://127.0.0.1:27017/tuner-pros');

// Items

const itemSchema = new mongoose.Schema({
    item_id: String,
    item_description: String,
    vendors: Array,
});

const Item = mongoose.model('Item', itemSchema);

// Items Ordered

const lineItemsSchema = new mongoose.Schema({
    poNumber: String,
    itemId: String,
    itemDescription: String,
    orderQuantity: Number,
    unitValue: String,
    lineTotal: String,
})

const LineItem = mongoose.model('Line Item', lineItemsSchema);

// Owner Details

const ownerSchema = new mongoose.Schema({
    company: String,
    attention: String,
    addressOne: String,
    addressTwo: String,
    city: String,
    state: String,
    postal: String,
    country: String,
    email: String,
    phone: String,
    fax: String
});

const Owner = mongoose.model('Owner', ownerSchema);

// Order Report

const orderReportSchema = new mongoose.Schema({
    orderNumber: String,
    sku: String,
    orderDate: String,
    orderQuantity: Number,
    skuDescription: String,
    fulfillmentStatus: String,
});

const OrderReport = mongoose.model('Order', orderReportSchema);

// Purchase Orders

const purchaseOrderSchema = new mongoose.Schema({
    poNumber: Number,
    date: String,
    dpfOrder: Number,
    vendor: String,
    company: String,
    attention: String,
    addressOne: String,
    addressTwo: String,
    city: String,
    state: String,
    postal: String,
    country: String,
    email: String,
    phone: String,
    currency: String,
    status: String,
    vehicleInformation: Object,
    notes: String
});

const PurchaseOrder = mongoose.model('Purchase Order', purchaseOrderSchema);

// Vendors

const vendorSchema = new mongoose.Schema({
    company: String,
    addressOne: String,
    addressTwo: String,
    city: String,
    state: String,
    postal: String,
    country: String,
    email: String,
    phone: String,
    fax: String,   
});

const Vendor = mongoose.model('Vendor', vendorSchema);

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    fname: String,
    lname: String,
    email: String,
    phone: String,
    userLevel: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

function calculateSubTotal(subTotals) {
    const subTotal = subTotals.reduce((currSum, currValue) => {
        return currSum + currValue
    })
    return subTotal
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, __dirname + '/public/csv');
    }, 
    filename: (req, file, cb) => {
        const fileName = 'export.csv'
        cb(null, fileName);
    }
});

const upload = multer({ storage });

app.route('/')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const query = PurchaseOrder.find({ status: 'Open' }).sort({ poNumber: 1 });
            query.exec((err, purchaseOrders) => {
                if (!err) {
                    res.render('home', { purchaseOrders: purchaseOrders });
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    });

app.route('/add-item')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const query = Vendor.find({}).sort({ company: 1 });
        
            query.exec((err, vendors) => {
                if (!err) {
                    res.render('add-item', { vendors: vendors });
                } else {
                    console.log(err);
                }
            }); 
        } else {
            res.redirect('/login');
        }   
    })
    .post((req, res) => {
        const item = new Item({    
            item_id: req.body.itemId,
            item_description: req.body.itemDescription,
            vendors: req.body.vendor
        })
        item.save();
        res.redirect('/items');
    });

app.route('/add-items-:id')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const poId = req.params.id;
            const subTotals = [0.00];
    
            PurchaseOrder.find({ _id: poId }, (err1, purchaseOrders) => {
                if (!err1) {
                    LineItem.find({ poNumber: poId }, (err2, foundItems) => {
                        if (!err2) {
                            foundItems.forEach((item) => {
                                subTotals.push(Number(item.orderQuantity) * Number(item.unitValue));
                            });
                            const subTotal = calculateSubTotal(subTotals);
                            res.render('add-line-items', {
                                purchaseOrders: purchaseOrders,
                                foundItems: foundItems,
                                subTotal: subTotal
                            });
                        } else {
                            console.log('Error 5:\n' + err2);
                        }
                    });
                } else {
                    console.log('Error 1:\n' + err1);
                }
            });
        } else {
            res.redirect('/login');
        }
    })
    .post((req, res) => {
        const lineItem = new LineItem({
            poNumber: req.body.poNumber,
            itemId: req.body.lineItem,
            itemDescription: req.body.description,
            orderQuantity: req.body.orderQty,
            unitValue: Number(req.body.unitValue).toFixed(2),
            lineTotal: (Number(req.body.unitValue) * Number(req.body.orderQty)).toFixed(2)
        });
        lineItem.save();
        res.redirect(req.originalUrl);
    });

app.route('/add-owner')
    .post((req, res) => {
        const newOwner = new Owner({
            company: req.body.company,
            attention: req.body.attention,
            addressOne: req.body.addressOne,
            addressTwo: req.body.addressTwo,
            city: req.body.city,
            state: req.body.state,
            postal: req.body.postal,
            country: req.body.country,
            email: req.body.email,
            phone: req.body.phone,
            fax: req.body.fax
        });
        newOwner.save();
        res.redirect('/admin');
    });

app.route('/add-user')
    .post((req, res) => {
        User.register({ username: req.body.username }, req.body.password, (err, user) => {
            if (err) { 
                console.log(err);
                res.redirect('/login');
            } else {
                passport.authenticate('local')(req, res, () => {
                    res.redirect('/admin');                   
                });
            }
            });
        });               

app.route('/add-vendor')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const vendor = {
                company: '',
                addressOne: '',
                addressTwo: '',
                city: '',
                state: '',
                postal: '',
                country: '',
                email: '',
                phone: '',
                fax: '', 
            }
            res.render('add-vendor', {vendor: vendor});
        } else {
            res.redirect('/login');
        }
    })
    .post((req, res) => {
        const newVendor = new Vendor({
            company: req.body.company,
            addressOne: req.body.addressOne,
            addressTwo: req.body.addressTwo,
            city: req.body.city,
            state: req.body.state,
            postal: req.body.postal,
            country: req.body.country,
            email: req.body.email,
            phone: req.body.phone,
            fax: req.body.fax
        });
        newVendor.save();
        res.redirect('/vendors');
    });

app.route('/admin')
    .get(async (req, res) => {
        const owner = await Owner.find({})
        let hasOwner = false;

        if (owner.length !== 0) {
            hasOwner = true;
        }
        
        const query = User.find({}).sort({ username: 1 });
        query.exec((err, users) => {
            if (!err) {
                res.render('admin', { users: users, hasOwner: hasOwner });        
            } else {
                console.log(err);
            }
        });
    });

app.route('/close-po-:id')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const poId = req.params.id;
            PurchaseOrder.findByIdAndUpdate(poId, {
                status: 'Closed'
            }, (err, docs) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(docs);
                }
            });
            res.redirect('/purchasing');
        } else {
            res.redirect('/login');
        }
    });

app.route('/create-po')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const dpf = {}
            const currentPurchaseOrders = [];
            const vendorQuery = Vendor.find({}).sort({ company: 1 });
    
            vendorQuery.exec((err1, vendors) => {
                if (!err1) {
                    const query = PurchaseOrder.find({}).sort({ poNumber: 1 });
                    query.exec((err2, purchaseOrders) => {
                        if (!err2) {
                            purchaseOrders.forEach((purchaseOrder) => {
                                currentPurchaseOrders.push(purchaseOrder.poNumber);
                            });
                            const previousPurchaseOrder = Number(currentPurchaseOrders[currentPurchaseOrders.length - 1])
                            const newPurchaseOrder = previousPurchaseOrder + 1
                            res.render('create-po', {
                                dpf: dpf,
                                newPurchaseOrder: newPurchaseOrder,
                                vendors: vendors
                            });
                        } else {
                            console.log('Error 2: ' + err2);
                        }
                    }); 
                } else {
                    console.log('Error 1: ' + err1);
                }
            });
        } else {
            res.redirect('/login');
        }
    })
    .post((req, res) => {
        const vehicleInformation = {
            vin: req.body.vin,
            make: req.body.make,
            transmission: req.body.transmission,
            transferCase: req.body.transferCase,
            tireSize: req.body.tireSize,
            fuelTank: req.body.fuelTank,
            mods: req.body.mods
        }        
        
        const newPO = new PurchaseOrder({
            poNumber: req.body.poNumber,
            date: req.body.date,
            dpfOrder: req.body.dpfOrder,
            vendor: req.body.vendor,
            company: req.body.company,
            attention: req.body.attention,
            addressOne: req.body.addressOne,
            addressTwo: req.body.addressTwo,
            city: req.body.city,
            state: req.body.state,
            postal: req.body.postal,
            country: req.body.country,
            email: req.body.email,
            phone: req.body.phone,
            currency: req.body.currency,
            status: 'Open',
            vehicleInformation: vehicleInformation,
            notes: req.body.notes
        });
        newPO.save();
        res.redirect('/purchasing');
    });

app.route('/delete-item-id=:id') 
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const itemId = req.params.id;
        
            Item.findByIdAndRemove(itemId, (err) => {
                if (!err) {
                    console.log('Successfully Deleted ' + itemId);
                    res.redirect('/items');
                } else {
                    console.log('Error: ' + err);
                }
            });  
        } else {
            res.redirect('/login');
        }
    });

app.route('/delete-po-:id')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const poId = req.params.id;
        
            PurchaseOrder.findByIdAndRemove(poId, (err1) => {
                if (!err1) {
                    LineItem.deleteMany({ poNumber: poId }, (err2) => {
                        if (!err2) {
                            console.log('Successfully Deleted Items');
                            console.log('Successfully Deleted ' + poId);
                            res.redirect('/purchasing');
                        } else {
                            console.log('Error 2: ' + err2);
                        }
                    });
                } else {
                    console.log('Error 1: ' + err1);
                }
            });
        } else {
            res.redirect('/login');
        }
    });

app.route('/delete-vendor-id=:id')
    .get((req, res) => {
        if (isAuthenticated()) {
            const vendorId = req.params.id;
            Vendor.findByIdAndRemove(vendorId, (err) => {
                if (!err) {
                    console.log('Successfully Deleted Vendor: ' + vendorId)
                    res.redirect('/vendors')
                } else {
                    console.log(err);
                }
            });   
        } else {
            res.redirect('/login');
        }
    })

app.route('/delete-line-item-:lineId-:redirectId')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const lineId = req.params.lineId;
            const redirectId = req.params.redirectId;
            
            LineItem.findByIdAndRemove(lineId, (err) => {
                if (!err) {
                    console.log('Successfully Deleted '+ lineId);
                    res.redirect('/add-items-' + redirectId);
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    });

app.route('/delete-user-:id')
    .get((req, res) => {
        const userId = req.params.id;

        User.findByIdAndRemove(userId, (err) => {
            if (!err) {
                res.redirect('/admin');
            } else {
                console.log(err);
            }
        });
    });

app.route('/dpf-po')
    .get((req, res) => {
        if (req.isAuthenticated()){
            const dpf = {
                company: 'Tuner Pros Research',
                attention: 'Receiving',
                addressOne: '20145 Stewart Crescent',
                city: 'Maple Ridge',
                state: 'BC',
                postal: 'V2X 0T6',
                country: 'Canada',
                email: 'sales@dpftunes.com',
            }
            const currentPurchaseOrders = [];
            
            const vendorQuery = Vendor.find({}).sort({ company: 1 });
            vendorQuery.exec((err1, vendors) => {
                if (!err1) {
                    const query = PurchaseOrder.find({}).sort({ poNumber: 1 });
                    query.exec((err2, purchaseOrders) => {
                        if (!err2) {
                            purchaseOrders.forEach((purchaseOrder) => {
                                currentPurchaseOrders.push(purchaseOrder.poNumber);
                            });
                            const previousPurchaseOrder = Number(currentPurchaseOrders[currentPurchaseOrders.length - 1])
                            const newPurchaseOrder = previousPurchaseOrder + 1
                            res.render('create-po', {
                                dpf: dpf,
                                newPurchaseOrder: newPurchaseOrder,
                                vendors: vendors
                            });
                        } else {
                            console.log('Error 2: ' + err2);
                        }
                    });
                } else {
                    console.log('Error 1: ' + err1);
                }
            });
        } else {
            res.redirect('/login');
        }
    })

app.route('/items')
    .get(async (req, res) => {
        if (req.isAuthenticated()) {
            const showAll = false;

            // Number of Records to show per page
            const perPage = 20;
            // Total Number of Records
            const total = await Item.find({})
            // Calculate number of Pagination Links Required
            const pages = Math.ceil(total.length / perPage);
            // Get Current Page Number
            const pageNumber = (req.query.page == null) ? 1 : req.query.page;
            // Get Records to Skid
            const startFrom = (pageNumber - 1) * perPage
    
            const query = Item.find({})
            .sort({ item_id: 1 })
            .skip(startFrom)
            .limit(perPage);
            query.exec((err, items) => {
                if (!err) {
                    res.render('items', { 
                        items : items, 
                        showAll: showAll,
                        pages: pages,
                        pageNumber: pageNumber,     
                    });    
                } else {
                    console.log(err);
                }
            });   
        } else {
            res.redirect('/login');
        }  
    });

app.route('/login')
    .get((req, res) => {
        res.render('log-in', {});
    })
    .post((req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, (err) => {
            if (err) {
                console.log(err)
            } else {
                passport.authenticate('local')(req, res, () => {
                    res.redirect('/');   
                })
            }
        });
    });

app.route('/logout')
    .get((req, res) => {
        req.logout(err => {
            if (err) {
                console.log(err);
            } else {
                res.redirect('/');        
            }
        });
    });

app.route('/open-po-:id')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const poId = req.params.id
            PurchaseOrder.findByIdAndUpdate(poId, {
                status: 'Open'
            }, (err, docs) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log(docs);
                }
            });
            res.redirect('/purchasing');
        } else {
            res.redirect('/login');
        }
    });

app.route('/order-report')
    .get(async (req, res) => {
        if (req.isAuthenticated()) {
            const showAll = false;

            // Number of Records to show per page
            const perPage = 50;
            // Total Number of Records
            const total = await OrderReport.find({ fulfillmentStatus: 'pending' });
            // Calculate number of Pagination Links Required
            const pages = Math.ceil(total.length / perPage);
            // Get Current Page Number
            const pageNumber = (req.query.page == null) ? 1 : req.query.page;
            // Get Records to Skid
            const startFrom = (pageNumber - 1) * perPage
            
            
            const query = OrderReport.find({ fulfillmentStatus: 'pending' })
            .sort({ orderDate: 1 })
            .skip(startFrom)
            .limit(perPage);
            query.exec((err, orders) => {
                if (!err) {
                    res.render('order-report', { 
                        orders : orders, 
                        showAll: showAll,
                        pages: pages,
                        pageNumber: pageNumber,     
                    });    
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login')
        }
    });

app.route('/order-summary')
    .get((req, res) => {   
        if (req.isAuthenticated()) {         
            const query = OrderReport.aggregate([
                {
                    $group: {
                        _id: { sku: '$sku', skuDescription: '$skuDescription' },
                        orderQuantity: { $sum: '$orderQuantity'} 
                    }
                }, { $sort: { _id: 1 } }
            ]);
            
            query.exec((err, orders) => {
                if (!err) {
                    res.render('order-summary', { orders, orders });
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login')
        }     
    });

app.route('/print-id=:id')
    .get((req, res) => {
        Owner.find({}, (ownerError, owners) => {
            if (!ownerError) {
                PurchaseOrder.findOne({ _id: req.params.id }, (purchaseOrderError, purchaseOrder) => {
                    if (!purchaseOrderError) {
                        const vendorId = purchaseOrder.vendor;

                        Vendor.findOne({ company: vendorId }, (vendorError, vendor) => {
                            if (!vendorError) {
                                LineItem.find({ poNumber: req.params.id }, (lineError, lineItems) => {
                                    if (!lineError) {
                                        const vehichleInformation = {
                                            vin: purchaseOrder.vehicleInformation.vin ,
                                            make: purchaseOrder.vehicleInformation.make ,
                                            transmission: purchaseOrder.vehicleInformation.transmission ,
                                            transferCase: purchaseOrder.vehicleInformation.transferCase ,
                                            tireSize: purchaseOrder.vehicleInformation.tireSize ,
                                            fuelTank: purchaseOrder.vehicleInformation.fuelTank ,
                                            mods: purchaseOrder.vehicleInformation.mods 
                                        }
                                        
                                        const stream = res.writeHead(200, {
                                            'Content-Type': 'application/pdf',
                                            'Content-Disposition': `attachment;filename=PO#${purchaseOrder.poNumber}.pdf`  
                                        });
                                
                                        pdfService.buildPDF(
                                            (chunk) => stream.write(chunk),
                                            () => stream.end(),
                                            owners,
                                            purchaseOrder, 
                                            vendor,
                                            lineItems, 
                                            vehichleInformation
                                        );        
                                    } else { console.log(`Line Error: ${lineError}`) }
                                });
                                
                            } else { console.log(`Vendor Error: ${vendorError}`); }
                        });
                    } else { console.log(`Purchase Order Error: ${purchaseOrderError}`) }
                });
            } else { console.log(`Owner Error: ${ownerError}`) }
        });
    });

app.route('/purchasing')
    .get(async (req, res) => {
        if (req.isAuthenticated()) {
            const showAll = false;

            // Number of Records to show per page
            const perPage = 20;
            // Total Number of Records
            const total = await PurchaseOrder.find({})
            // Calculate number of Pagination Links Required
            const pages = Math.ceil(total.length / perPage);
            // Get Current Page Number
            const pageNumber = (req.query.page == null) ? 1 : req.query.page;
            // Get Records to Skid
            const startFrom = (pageNumber - 1) * perPage
    
            const query = PurchaseOrder.find({})
            .sort({ poNumber: 1 })
            .skip(startFrom)
            .limit(perPage);
            query.exec((err, purchaseOrders) => {
                if (!err) {
                    res.render('purchasing', { 
                        purchaseOrders : purchaseOrders, 
                        showAll: showAll,
                        pages: pages,
                        pageNumber: pageNumber,     
                    });    
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login')
        }
    });
    
app.route('/search-items')
    .post((req, res) => {
        const showAll = true;
        const searchID = req.body.item;
        Item.find({ item_id: searchID }, (err, items) => {
            if (!err) {
                res.render('items', { 
                    items: items, 
                    showAll: showAll,
                    pages: 1,
                    pageNumber: 1,  
                });
            } else {
                console.log(err);
            }
        });
    });

app.route('/search-order')
    .post((req, res) => {
        if (req.isAuthenticated) {
            const showAll = true;
            const searchID = `#${req.body.orderNumber}`;
            
            OrderReport.find({ orderNumber: searchID }, (err, orders) => {
                if (!err) {
                    res.render('order-report', { 
                        orders: orders, 
                        showAll: showAll,
                        pages: 1,
                        pageNumber: 1, 
                    });
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    });

app.route('/search-po')
    .post((req, res) => {
        if (req.isAuthenticated()) {
            const showAll = true;
            const searchID = req.body.poNumber;
            PurchaseOrder.find({ poNumber: searchID }, (err, purchaseOrders) => {
                if (!err) {
                    res.render('purchasing', { 
                        purchaseOrders: purchaseOrders, 
                        showAll: showAll,
                        pages: 1,
                        pageNumber: 1, 
                    });
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    });

app.route('/search-vendors')
    .post((req, res) => {
        const showAll = true;
        const searchID = req.body.vendor;
        Vendor.find({ company: searchID }, (err, vendors) => {
            if (!err) {
                res.render('vendors', { 
                    vendors: vendors, 
                    showAll: showAll,
                    pages: 1,
                    pageNumber: 1,  
                });
            } else {
                console.log(err);
            }
        });
    });

app.route('/settings')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            Owner.find({}, (err, owners) => {
                if (!err) {
                    res.render('settings', { owners, owners });
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    });

app.route('/show-orders-:id')
    .get((req, res) => {
        const searchId = req.params.id;
        
        const query = OrderReport.find({ sku: searchId }).sort({ orderNumber: 1 });

        query.exec((err, orders) => {
            if (!err) {
                res.render('show-orders', { orders: orders, sku: searchId });
            } else {
                console.log(err);
            }
        });
    });

app.route('/show-purchase-order-:id')
    .get((req, res) => {
        const searchId = req.params.id
        const subTotals = [0.00];
        
        PurchaseOrder.findOne( {_id : searchId }, (purchaseOrderError, purchaseOrder) => {
            if (!purchaseOrderError) {
                LineItem.find({ poNumber: searchId }, (lineItemError, lineItems) => {
                    if (!lineItemError) {
                        lineItems.forEach((item) => {
                            subTotals.push(Number(item.orderQuantity) * Number(item.unitValue));
                        });
                        const subTotal = calculateSubTotal(subTotals);
                        res.render('show-purchase-order', {
                            purchaseOrder: purchaseOrder,
                            lineItems: lineItems,
                            subTotal: subTotal
                        });
                    } else {
                        console.log(`Line Item Error: ${lineItemError}`)
                    }
                });
            } else {
                console.log(`Purchase Order Error: ${purchaseOrderError}`);
            }
        });
    })

app.route('/update-owner-id=:id')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const ownerId = req.params.id;
            Owner.find({ _id: ownerId }, (err, owners) => {
                if (!err) {
                    res.render('update-owner', { owners: owners});
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    })
    .post((req, res) => {
        const ownerId = req.body.updateId;
        
        Owner.findByIdAndUpdate(ownerId, {
            company: req.body.company,
            attention: req.body.attention,
            addressOne: req.body.addressOne,
            addressTwo: req.body.addressTwo,
            city: req.body.city,
            state: req.body.state,
            postal: req.body.postal,
            country: req.body.country,
            email: req.body.email,
            phone: req.body.phone,
            fax: req.body.fax
        }, (err, docs) => {
            if (err) {
                console.log(err);
            } else {
                console.log(docs);
            }
        });
        res.redirect('/settings');        
    });

app.route('/update-po-:id')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const poId = req.params.id;
            PurchaseOrder.find({ _id: poId }, (err, purchaseOrders) => {
                if (!err) {
                    res.render('update-po', { purchaseOrders: purchaseOrders});
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    })
    .post((req, res) => {
        const poId = req.body.updateId;
        
        const vehicleInformation = {
            vin: req.body.vin,
            make: req.body.make,
            transmission: req.body.transmission,
            transferCase: req.body.transferCase,
            tireSize: req.body.tireSize,
            fuelTank: req.body.fuelTank,
            mods: req.body.mods
        }   
        
        PurchaseOrder.findByIdAndUpdate(poId, {
            poNumber: req.body.poNumber,
            date: req.body.date,
            dpfOrder: req.body.dpfOrder,
            vendor: req.body.vendor,
            company: req.body.company,
            attention: req.body.attention,
            addressOne: req.body.addressOne,
            addressTwo: req.body.addressTwo,
            city: req.body.city,
            state: req.body.state,
            postal: req.body.postal,
            country: req.body.country,
            email: req.body.email,
            phone: req.body.phone,
            currency: req.body.currency,
            vehicleInformation: vehicleInformation,
            notes: req.body.notes
        }, (err, docs) => {
            if (err) {
                console.log(err);
            } else {
                console.log(docs);
            }
        });
        res.redirect('/purchasing');
    });

app.route('/update-vendor-id=:id')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            const vendorId = req.params.id;
            Vendor.findOne({ _id: vendorId }, (err, vendor) => {
                if (!err) {
                    res.render('add-vendor', { vendor: vendor});
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    })
    .post((req, res) => {
        const vendorId = req.body.updateId;
        Vendor.findByIdAndUpdate(vendorId, {
            company: req.body.company,
            addressOne: req.body.addressOne,
            addressTwo: req.body.addressTwo,
            city: req.body.city,
            state: req.body.state,
            postal: req.body.postal,
            country: req.body.country,
            email: req.body.email,
            phone: req.body.phone,
            fax: req.body.fax
        }, (err, docs) => {
            if (err) {
                console.log(err);
            } else {
                console.log(docs);
            }
        });
        res.redirect('/vendors');  
    });

app.route('/upload')
    .get((req, res) => {
        if (req.isAuthenticated()) {
            OrderReport.deleteMany({}, (err) => {
                if (!err) {
                    console.log('Sucessfully Reset Order Report');
                    res.render('upload', {});
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    })
    .post(upload.single('fileName'), (req, res) => {
        const updated_records = [];
        const chargeback = [];

        const parser = parse({ columns: true }, (err, records) => {   
            records.forEach((record) => {
                if (record['Tags'] === 'Chargeback' || record['Cancelled at'] != ''){
                    chargeback.push(record['Name']);                   
                } else if (chargeback.includes(record['Name'])) {

                } else {
                    const date = record['Created at'].split(' ');

                    updated_records.push(new OrderReport({
                        orderNumber: record['Name'],
                        sku: record['Lineitem sku'],
                        orderDate: date[0],
                        orderQuantity: record['Lineitem quantity'],
                        skuDescription: record['Lineitem name'],
                        fulfillmentStatus: record['Lineitem fulfillment status'],
                    }));
                }
            });

            OrderReport.insertMany(updated_records)
            .then(()=> {
                console.log('Data Inserted');
                res.redirect('/order-report');
            })
            .catch((error) => {
                console.log(error)
            })
        });
        
        fs.createReadStream(__dirname + '/public/csv/export.csv').pipe(parser); 
    });

app.route('/vendors')
    .get(async (req, res) => {
        if (req.isAuthenticated()) {
            const showAll = false;

            // Number of Records to show per page
            const perPage = 10;
            // Total Number of Records
            const total = await Vendor.find({})
            // Calculate number of Pagination Links Required
            const pages = Math.ceil(total.length / perPage);
            // Get Current Page Number
            const pageNumber = (req.query.page == null) ? 1 : req.query.page;
            // Get Records to Skid
            const startFrom = (pageNumber - 1) * perPage
    
            const query = Vendor.find({})
            .sort({ company: 1 })
            .skip(startFrom)
            .limit(perPage);
            query.exec((err, vendors) => {
                if (!err) {
                    res.render('vendors', { 
                        vendors : vendors, 
                        showAll: showAll,
                        pages: pages,
                        pageNumber: pageNumber,
                        pages: pages,      
                    });    
                } else {
                    console.log(err);
                }
            });
        } else {
            res.redirect('/login');
        }
    })

let port = process.env.PORT;
if (port == null || port == '') {
    port = 3000;
}

app.listen(port || 3000, () => {
    console.log('Server Started on Port ' + port);
});