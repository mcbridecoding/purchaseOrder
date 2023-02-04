const PDFDocument = require('pdfkit-table');

function buildPDF(dataCallback, endCallback, owners, purchaseOrder, vendor, lineItems, vehichleInformation) {
    const doc = new PDFDocument({ size: 'Letter', margins: { left: 45, right: 45, bottom: 5 } });       

    const docWidth = 612 
    const docHeight = 792;
    
    doc.on('data', dataCallback);
    doc.on('end', endCallback);
    doc.fontSize(16);
    doc.font('Helvetica')
    
    // Owner / Header Section
    owners.forEach((owner) => {
        doc.font('Helvetica-Bold');
        doc.text(`${owner.company}`, 50, 50); 
        doc.font('Helvetica');   
        doc.fontSize(10);
        doc.text(`${owner.addressOne}`, 50, 70);
        doc.text(`${owner.city} ${owner.state} ${owner.postal}`);
        doc.text(`${owner.phone}`);
        doc.text(`${owner.email}`);
    });
    doc.fontSize(20);
    doc.font('Helvetica-Bold')
    doc.fillColor('red');
    doc.text(`PURCHASE ORDER`, 351, 50, { align: 'right' });
    doc.fillColor('black');
    doc.font('Helvetica');
    doc.fontSize(10);
    
    doc.text(`PO #:`, 400, 75, { align: 'left' });
    doc.text(`Date:`, 400, 90, { align: 'left' });
    doc.text(`DPF Order #:`, 400, 105, { align: 'left' });
    
    doc.text(`${purchaseOrder.poNumber}`, 480, 75, { align: 'right' });
    doc.text(`${purchaseOrder.date}`, 480, 90, { align: 'right' });
    doc.text(`${purchaseOrder.dpfOrder}`, 480, 105, { align: 'right' });


    // Draw Boxes 
    
    // -> Vendor Box
    doc.moveTo(45, 145).lineTo(((docWidth / 2) - 100), 145).stroke();
    doc.moveTo(45, 165).lineTo(((docWidth / 2) - 100), 165).stroke();
    doc.moveTo(45, 145).lineTo(45, 165).stroke();
    doc.moveTo((docWidth / 2) - 100, 145).lineTo((docWidth / 2) - 100, 165).stroke();
    
    // -> Bottom Line

    doc.moveTo(395, 145).lineTo((docWidth - 45), 145).stroke();
    doc.moveTo(395, 165).lineTo((docWidth - 45), 165).stroke();
    doc.moveTo(395, 145).lineTo(395, 165).stroke();
    doc.moveTo((docWidth - 45), 145).lineTo((docWidth - 45), 165).stroke();

    // Vendor Section
    doc.fontSize(12);
    doc.font('Courier-Bold');
    doc.text(`Vendor:`, 50, 150);
    doc.font('Times-Bold');
    doc.fontSize(11);
    doc.text(`${vendor.company}`, 50, 170);   
    doc.fontSize(10);
    doc.font('Times-Roman');
    doc.text(`${vendor.addressOne}`);   
    doc.text(`${vendor.addressTwo}`);   
    doc.text(`${vendor.city} ${vendor.state} ${vendor.postal}`);    
    doc.text(`${vendor.phone}`);
    doc.text(`${vendor.email}`);

    // Ship To Section
    doc.fontSize(12);
    doc.font('Courier-Bold');
    doc.text(`Ship To:`, 400, 150);
    doc.font('Times-Bold');
    doc.fontSize(11);
    doc.text(`${purchaseOrder.company}`, 400, 170);   
    doc.fontSize(10);
    doc.font('Times-Roman');
    doc.text(`${purchaseOrder.addressOne}`);   
    doc.text(`${purchaseOrder.addressTwo}`);   
    doc.text(`${purchaseOrder.city} ${purchaseOrder.state} ${purchaseOrder.postal}`);    
    doc.text(`${purchaseOrder.phone}`);
    doc.text(`${purchaseOrder.email}`);

    const table = { 
        title: '',
        headers: [
            {label: 'Item ID', property: 'itemId', width: 100},
            {label: 'Quantity', property: 'orderQuantity', width: 50, align: 'center'},
            {label: 'Description', property: 'itemDescription', width: 252},
            {label: 'Unit Price', property: 'unitValue', width: 75, align: 'right'},
            {label: 'Line Total', property: 'lineTotal', width: 75, align: 'right'}
        ],
        rows: [],
        datas: lineItems
      };

    const subTotals = [];
    
    lineItems.forEach(lineItem => {
        subTotals.push(Number(lineItem.lineTotal))
    });

    const subTotal = subTotals.reduce((a, b) => a + b, 0);
    const tax = subTotal * 0.5;
    const total = subTotal * 1.05;

    doc.table(table, { width: (docWidth - 60) , x: 30, y: 265 });
    
    if (vehichleInformation.vin === '' || vehichleInformation.vin === null) {

    } else {
        doc.fontSize(11);
        doc.font('Times-Bold');
        doc.text(`Vin:`, (docWidth / 2) + 50, (docHeight / 2));
        doc.text(`Make:`, (docWidth / 2) + 50, (docHeight / 2) + 15);
        doc.text(`Transmission:`, (docWidth / 2) + 50, (docHeight / 2) + 30);
        doc.text(`Transfer Case:`, (docWidth / 2) + 50, (docHeight / 2) + 45);
        doc.text(`Tire Size:`, (docWidth / 2) + 50, (docHeight / 2) + 60);
        doc.text(`Fuel Tank:`, (docWidth / 2) + 50, (docHeight / 2) + 75);
        doc.text(`Mods:`, (docWidth / 2) + 50, (docHeight / 2) + 90);
        doc.font('Times-Roman');
        doc.text(`${vehichleInformation.vin }`, (docWidth / 2) + 125, (docHeight / 2));
        doc.text(`${vehichleInformation.make }`, (docWidth / 2) + 125, (docHeight / 2) + 15);
        doc.text(`${vehichleInformation.transmission }`, (docWidth / 2) + 125, (docHeight / 2) + 30);
        doc.text(`${vehichleInformation.transferCase }`, (docWidth / 2) + 125, (docHeight / 2) + 45);
        doc.text(`${vehichleInformation.tireSize }`, (docWidth / 2) + 125, (docHeight / 2) + 60);
        doc.text(`${vehichleInformation.fuelTank }`, (docWidth / 2) + 125, (docHeight / 2) + 75);
        doc.text(`${vehichleInformation.mods }`, (docWidth / 2) + 125, (docHeight / 2) + 90, { width: (docWidth / 2) - 155 });
    }

    doc.moveTo(25, 625).lineTo((docWidth - 25), 625).stroke();
    doc.moveTo(25, 627).lineTo((docWidth - 25), 627).stroke();

    doc.text(`Notes: \n${purchaseOrder.notes}`, 25, 640, { align: 'left', width: (docWidth / 2) });

    doc.moveTo((docWidth / 2) + 50, 640).lineTo((docWidth - 25), 640).stroke();
    doc.moveTo((docWidth / 2) + 50, 780).lineTo((docWidth - 25), 780).stroke();
    doc.moveTo((docWidth / 2) + 50, 640).lineTo((docWidth / 2) + 50, 780).stroke();
    
    doc.moveTo((docWidth -25 ), 640).lineTo((docWidth - 25), 780).stroke();

    doc.fontSize(11);
    doc.font('Courier-Bold');
    doc.text('SubTotal:', (docWidth / 2) + 60, 670);
    doc.text('Tax (5%):', (docWidth / 2) + 60, 690);
    doc.text('Total:', (docWidth / 2) + 60, 710);

    doc.fontSize(11);
    doc.font('Times-Roman');
    doc.text(`$ ${subTotal.toFixed(2)}`, (docWidth / 2) + 150, 670, { align: 'right'});
    doc.text(`$ ${tax.toFixed(2)}`, (docWidth / 2) + 150, 690, { align: 'right'});
    doc.text(`$ ${total.toFixed(2)}`, (docWidth / 2) + 150, 710, { align: 'right'});

    doc.fontSize(9)
    doc.text(`All Funds are in ${purchaseOrder.currency}`, (docWidth / 2) + 60, 760, { align: 'right'} );
    
    doc.end();
}

module.exports = { buildPDF }