import { Logform } from 'winston';
export default interface MongoTransportOptions {
    level: string;
    db: string;
    options: {
        useUnifiedTopology: boolean;
        [key: string]: string | number | boolean;
    };
    collection: string;
    storeHost?: boolean;
    decolorize?: boolean;
    format?: Logform.Format;
}
