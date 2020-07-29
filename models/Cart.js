const Cart = function(initItems) {
    this.items = initItems.items||{}
    this.add = function (item, id) {
        var storedItem = this.items[id];
        if (!storedItem) {

            let itemprice = item.price.split(",")
            itemprice=itemprice.join("")
            storedItem = this.items[id] = {qty: 0, item:[itemprice,item.prod_img,item.prod_name], price: 0};
        }
        storedItem.qty++;
        storedItem.price = storedItem.item[0] * storedItem.qty;
        return storedItem;
    
    };

    this.generateArray = function () {
        var arr = [];
        for (var id in this.items) {
            arr.push(this.items[id]);
        }
        return arr;
    };
};
const convertItems = function(items){
    let newArr=[]
    let newItem
    let totalPrice=0
    items.forEach(item_u => {
        newItem = {}
        newItem.name = item_u.item[2]
        newItem.amount = item_u.item[0] * 100
        newItem.quantity = item_u.qty
        newItem.currency = 'inr'
        newArr.push(newItem)
        totalPrice=totalPrice+item_u.price
    })
     return [newArr,totalPrice]
};
module.exports ={
    convertItems:convertItems,
    Cart:Cart
}