using clorox.sales as po from '../db/data-model';

service CatalogService {
    entity Records as projection on po.Records;
}