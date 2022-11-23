const cds = require('@sap/cds')
const {Records} = cds.entities
const SapCfMailer = require('sap-cf-mailer').default;
const transporter = new SapCfMailer("Mail_Destination");

module.exports = cds.service.impl(srv => {
    srv.before('CREATE','Records', _triggerInitMail)
})

async function _triggerInitMail (req) {
    let email = req.data.emailId;
    const result = await transporter.sendMail({
        to: email,
        subject: `This is the mail subject`,
        text: `body of the email`
    });
}