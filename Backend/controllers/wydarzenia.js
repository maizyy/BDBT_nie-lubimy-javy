const wydarzenia = require('../db_apis/wydarzenia.js');

async function get(req, res, next){
    try{
        const context = {};
        context.id = parseInt(req.query.id, 10);
        context.typ_wydarzenia = req.query.typ;
        const rows = await wydarzenia.find(context);
        if (req.query.id) {
            if (rows.length === 1){
                res.status(200).json(rows[0]);
            } else {
                res.status(404).end();
            } 
        } else {
            res.status(200).json(rows);
        }
    } catch (err) {
        next(err);
    }
}

module.exports.get = get;