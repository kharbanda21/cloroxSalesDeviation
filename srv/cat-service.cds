using clorox.sales as po from '../db/data-model';

service CatalogService {
    entity Records as projection on po.Records;

    type response {
        data : String
    };
    action createRecord(createData : String) returns response;
}