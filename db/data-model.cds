using {cuid} from '@sap/cds/common';
namespace clorox.sales;

entity Records: cuid {
  poNumber  : String;
  itemNumber  : Integer;
  orderNumber: String;
  price: Decimal;
  quantity: Integer;
  deliveryDate: Date;
  deviationType: String;
  emailId: String;
  reminderDate1: Date;
  reminderDate2: Date;
  reminderDate3: Date;
  poUpdateFlag: Integer;
}