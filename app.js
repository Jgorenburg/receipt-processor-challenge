const express = require('express')
const bodyParser = require('body-parser')

const app = express()
let storage = []

app.use(bodyParser.json())

app.get('/receipts/:id/points', (req, res) => {
    const id = parseInt(req.params.id)
    if (id < 0 || id >= storage.length) {
        res.status(404).send("No receipt found for that id");
    }
    else {
        res.json({ "points": storage[id] })
    }
})

app.post('/receipts/process', (req, res) => {
    console.log(req.body);
    console.log(req.body.retailer);
    const points = calculatePoints(req.body);
    console.log(points)
    storage.push(points)
    console.log(storage)
    res.json({ "id": storage.length - 1 });
})


app.listen(3000, () => {
    console.log('Example app listening on port 3000!')
})


function calculatePoints(receipt) {
    // Points from the Retailer's name
    let namePoints = 0;
    for (i = 0; i < receipt.retailer.length; i++) {
        code = receipt.retailer.charCodeAt(i);
        if ((code > 47 && code < 58) ||     // numeric (0-9)
            (code > 64 && code < 91) ||     // upper alpha (A-Z)
            (code > 96 && code < 123)) {    // lower alpha (a-z)
            namePoints += 1;
        }
    }


    // Points from total dollar amount
    let dollarTotalPoints = 0;
    const dollarFormat = /^\d+\.(\d{2})$/;
    const total = receipt.total.match(dollarFormat);
    if (total) {
        // total[1] is the decimal portion
        if (total[1] == "00") {
            dollarTotalPoints = 75;
        }
        else if (total[1] == "25" ||
            total[1] == "50" ||
            total[1] == "75") {
            dollarTotalPoints = 25;
        }
    }

    // Points from items
    const items = receipt.items;
    let itemPoints = Math.floor(items.length / 2) * 5;
    for (i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.shortDescription.trim().length % 3 == 0) {
            itemPoints += Math.ceil(parseFloat(item.price) * 0.2)
        }
    }


    // Points from date and time
    let dateTimePoints = 0;

    if (parseInt(receipt.purchaseDate.slice(-2)) % 2 == 1) {
        dateTimePoints = 6;
    }


    const hour = receipt.purchaseTime.slice(0, 2)
    if (hour == "15") {
        dateTimePoints += 10;
    }
    // I'm treating the range as not inclusive, so if a purchase is at exactly 14:00, it
    // will award no points
    else if (hour == "14" && receipt.purchaseTime.slice(-2) != "00") {
        dateTimePoints += 10
    }

    return namePoints + dollarTotalPoints + itemPoints + dateTimePoints
}