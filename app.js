const express = require('express')
const bodyParser = require('body-parser')

const app = express()
let storage = []

app.use(bodyParser.json())

app.get('/receipts/:id/points', (req, res) => {
    const id = parseInt(req.params.id)
    if (id < 0 || id >= storage.length) {
        res.status(404).send("No receipt found for that id")
    }
    else {
        res.json({ "points": storage[id] })
    }
})

app.post('/receipts/process', (req, res) => {
    try {
        const points = calculatePoints(req.body)
        storage.push(points)
        const id = (storage.length - 1).toString().padStart(6, 0)
        res.json({ "id": id })
    } catch (error) {
        res.status(400).send("The receipt is invalid")
        throw error
    }
})

app.listen(3000, () => {
    console.log('Receipt Processor listening on port 3000!')
})


class ReceiptError extends Error {
    constructor(message) {
        super(message);
        this.name = "ReceiptError";
    }
}

function calculatePoints(receipt) {
    // Points from the Retailer's name
    if (receipt.retailer == "") {
        throw new ReceiptError("Retailer must have a name")
    }

    let namePoints = 0
    for (i = 0; i < receipt.retailer.length; i++) {
        code = receipt.retailer.charCodeAt(i)
        if ((code > 47 && code < 58) ||     // numeric (0-9)
            (code > 64 && code < 91) ||     // upper alpha (A-Z)
            (code > 96 && code < 123)) {    // lower alpha (a-z)
            namePoints += 1
        }
        // Only other allowed characters are '-', '&', and whitespace
        else if (code != 38 && code != 45 && !(/\s/.test(receipt.retailer[i]))) {
            throw new ReceiptError("Malformed retailer name")
        }
    }


    // Points from total dollar amount
    let dollarTotalPoints = 0
    const priceFormat = /^\d+\.(\d{2})$/
    const total = receipt.total.match(priceFormat)
    if (total) {
        // total[1] is the decimal portion
        if (total[1] == "00") {
            dollarTotalPoints = 75
        }
        else if (total[1] == "25" ||
            total[1] == "50" ||
            total[1] == "75") {
            dollarTotalPoints = 25
        }
    }
    else {
        throw new ReceiptError("Invalid dollar amount")
    }


    // Points from items
    const items = receipt.items
    const descFormat = /^[\w\s\-]+$/

    if (items.length == 0) {
        throw new ReceiptError("Receipt must contain at least one purchased item")
    }

    // points based on number of items
    let itemPoints = Math.floor(items.length / 2) * 5

    // points for each item
    for (i = 0; i < items.length; i++) {
        const item = items[i]

        if (item.shortDescription == "") {
            throw new ReceiptError("All items must have descriptions")
        }
        if (!descFormat.test(item.shortDescription)) {
            throw new ReceiptError(`${item.shortDescription} is not a valid item description`)
        }
        if (!priceFormat.test(item.price)) {
            throw new ReceiptError(`The item ${item.shortDescription}'s price is not in the expected format`)
        }

        if (item.shortDescription.trim().length % 3 == 0) {
            itemPoints += Math.ceil(parseFloat(item.price) * 0.2)
        }
    }


    // Points from date and time
    let dateTimePoints = 0
    const dateFormat = /^\d{4}\-\d{2}\-(\d{2})$/
    const timeFormat = /^(\d{2}):(\d{2})$/

    const date = receipt.purchaseDate.match(dateFormat)
    if (!date) {
        throw new ReceiptError("Invalid date")
    }
    else if (date[1] % 2 == 1) {
        dateTimePoints = 6
    }

    const time = receipt.purchaseTime.match(timeFormat)
    if (!time) {
        throw new ReceiptError("Invalid time")
    }

    // My interpretation of the rules is that the range is non-inclusive, so if 
    // a purchase is at exactly 14:00, it will award no points
    const hour = time[1]
    if (hour == "15" ||
        (hour == "14" && time[2] != "00")
    ) {
        dateTimePoints += 10
    }


    return namePoints + dollarTotalPoints + itemPoints + dateTimePoints
}