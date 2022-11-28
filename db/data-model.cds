using {cuid} from '@sap/cds/common';
namespace clorox.sales;

entity Records {
  key poNumber  : String;
  key itemNumber  : String;
  orderNumber: String;
  price: String;
  quantity: String;
  deliveryDate: Date;
  deviationType: String;
  emailId: String;
  initialMailDate: DateTime;
  reminderDate1: DateTime;
  reminderDate2: DateTime;
  reminderDate3: DateTime;
  poUpdateFlag: String;
}