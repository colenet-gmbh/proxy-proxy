import * as express from 'express';

let app : express.Application = express();
let router: express.Router;
router = express.Router();

router.get( '/', (req, resp) => {

    resp.sendStatus(200);
});

app.use(router);
app.listen(4000);
console.info('Started server on 4000' );