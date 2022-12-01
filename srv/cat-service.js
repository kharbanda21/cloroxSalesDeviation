const cds = require('@sap/cds')
const { Records } = cds.entities('clorox.sales')
const SapCfMailer = require('sap-cf-mailer').default;
const transporter = new SapCfMailer("Mail_Destination");

module.exports = cds.service.impl(srv => {
    srv.after('CREATE', 'Records', _triggerInitMail)
    srv.on('batchReminders', _triggerReminder)
    srv.on('createRecord', async (req) => {
        try {
            let payload = JSON.parse(req.data.createData);
            let dateEmail = await _getDateTime(new Date());
            let insertResult = await _insertRecord(req, payload);
            //after insertion send mail
            if (insertResult.results.length > 0) {
                let resultMail = await _sendMail(payload, dateEmail);
                //after sending mail update the date
                if (resultMail.accepted.length > 0) {
                    let updateResult = await _updateRecord(req, payload, dateEmail);
                    if (!updateResult) {
                        return req.error({
                            message: "Mail sent but date not recorded"
                        })
                    }
                } else {
                    return req.error({
                        message: "Mail not sent"
                    })
                }

            } else {
                return req.error({
                    message: "Record not inserted"
                })
            }
            let resultData = { data: "Success" };
            return resultData;
        }
        catch (error) {
            return req.error({
                message: error.message
            })
        }
    });
})

async function _sendMail(payload, dateEmail) {
    let email = payload.emailId;
    let sSubject = "You have Order Confirmation price deviations pending approval";
    let sText = "PO – " + payload.poNumber + "(item-" + payload.itemNumber + ") was confirmed by the supplier – ABC and have items that were confirmed on " + dateEmail + " is out of tolerance and that requires approval.";
    const resultMail = await transporter.sendMail({
        to: email,
        subject: sSubject,
        text: sText
    });
    return resultMail;
}

async function _updateRecord(req, payload, dateEmail) {
    const tx = cds.transaction(req);
    try {
        const updateResult = await tx.run(UPDATE(Records).set({ initialMailDate: dateEmail }).where({ poNumber: payload.poNumber, itemNumber: payload.itemNumber }));
        return updateResult;
    }
    catch (error) {
        return req.error({
            message: error.message
        })
    }
}

async function _insertRecord(req, payload) {
    const tx = cds.transaction(req);
    try {
        const insertResult = await tx.run(
            INSERT.into(Records).entries(
                {
                    poNumber: payload.poNumber,
                    itemNumber: payload.itemNumber,
                    orderNumber: payload.orderNumber,
                    price: payload.price,
                    quantity: payload.quantity,
                    deliveryDate: payload.deliveryDate,
                    deviationType: payload.deviationType,
                    emailId: payload.emailId,
                    initialMailDate: null,
                    reminderDate1: null,
                    reminderDate2: null,
                    reminderDate3: null,
                    poUpdateFlag: payload.poUpdateFlag

                }
            )
        );
        return insertResult;
    }
    catch (error) {
        return req.error({
            message: error.message
        })
    }
}

async function _getDateTime(date_ob) {
    // adjust 0 before single digit date
    let date = ("0" + date_ob.getDate()).slice(-2);

    // current month
    let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);

    // current year
    let year = date_ob.getFullYear();

    // current hours
    let hours = ("0" + date_ob.getHours()).slice(-2);

    // current minutes
    let minutes = ("0" + date_ob.getMinutes()).slice(-2);

    // current seconds
    let seconds = date_ob.getSeconds();
    let nowDateTime = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
    return nowDateTime;
}

async function _triggerInitMail(payload, req) {
    let dateEmail = await _getDateTime(new Date());
    let resultMail = await _sendMail(payload, dateEmail);
    //after sending mail update the date
    if (resultMail.accepted.length > 0) {
        let updateResult = await _updateRecord(req, payload, dateEmail);
        if (!updateResult) {
            // return req.error({
            //     message: "Mail sent but date not recorded"
            // })
        }
    } else {
        // return req.error({
        //     message: "Mail not sent"
        // })
    }

}

async function _triggerReminder(req) {
    const tx = cds.transaction(req);
    try {
        const selectResult = await tx.run(SELECT.from(Records).where({ poUpdateFlag: '0' }));
        if (selectResult) {
            let dateNow = await _getDateTime(new Date());
            selectResult.forEach(record => {
                //call PO service to check deviation corrected or not
                //update poUpdateFlag to 1 if deviation is corrected

                //when deviation is still there then send reminder mail
                let email = record.emailId;
                let sSubject = "REMINDER - You have Order Confirmation price deviations pending approval";
                let sText = "PO – " + record.poNumber + " (item-" + record.itemNumber + ") was confirmed by the supplier – ABC and have items that were confirmed on " + dateNow + " is out of tolerance and that requires approval.";        
                let diffHrs = 48;
                if (!record.reminderDate1) {
                    
                    if (record.initialMailDate) {
                        diffHrs = diff_hours(new Date(dateNow), new Date(record.initialMailDate));
                    }
                    if (diffHrs >= 48) {
                        transporter.sendMail({
                            to: email,
                            subject: sSubject,
                            text: sText
                        }).then((mailResult)=>{
                            if(mailResult.accepted.length > 0) {
                                cds.run(UPDATE(Records).set({ reminderDate1: dateNow }).where({ poNumber: record.poNumber, itemNumber: record.itemNumber }));
                            }
                        });              
                    }
                } else if (!record.reminderDate2) {
                    
                    if (record.reminderDate1) {
                        diffHrs = diff_hours(new Date(dateNow), new Date(record.reminderDate1));
                    }
                    if (diffHrs >= 24) {
                        transporter.sendMail({
                            to: email,
                            subject: sSubject,
                            text: sText
                        }).then((mailResult)=>{
                            if(mailResult.accepted.length > 0) {
                                cds.run(UPDATE(Records).set({ reminderDate2: dateNow }).where({ poNumber: record.poNumber, itemNumber: record.itemNumber }));
                            }
                        });              
                    }

                } else if (!record.reminderDate3) {
                    
                    if (record.reminderDate2) {
                        diffHrs = diff_hours(new Date(dateNow), new Date(record.reminderDate2));
                    }
                    if (diffHrs >= 24) {
                        transporter.sendMail({
                            to: email,
                            subject: sSubject,
                            text: sText
                        }).then((mailResult)=>{
                            if(mailResult.accepted.length > 0) {
                                cds.run(UPDATE(Records).set({ reminderDate3: dateNow }).where({ poNumber: record.poNumber, itemNumber: record.itemNumber }));
                            }
                        });              
                    }

                }
            });
        }
        let resultData = { data: "Success" };
        return resultData;
    }
    catch (error) {
        return req.error({
            message: error.message
        })
    }
}

function diff_hours(dt2, dt1) {

    var diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= (60 * 60);
    return Math.abs(Math.round(diff));

}