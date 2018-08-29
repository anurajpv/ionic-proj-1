import { Component } from '@angular/core';
import { IonicPage, NavController, NavParams, ViewController, AlertController, LoadingController} from 'ionic-angular';
import { RestProvider } from '../../providers/rest/rest';
import { AuthService } from '../../services/auth.service';
import { CheckoutPage } from '../checkout/checkout';

@IonicPage()
@Component({
  selector: 'page-cart',
  templateUrl: 'cart.html',
})
export class Cart {
  cartList : any = [];
  user : any = [];
  grandTotal = 0;
  subTotal = 0;
  shippingCharge = 0;
  totalDiscount = 0;

  constructor(public navCtrl: NavController, private auth: AuthService,
    private rest: RestProvider, public viewCtrl: ViewController, public alertMenu: AlertController,
    public loadingCtrl: LoadingController, ) {

    this.user = this.auth.getUserInfo();
    if(this.user.previlage != "Salesman")
      this.shippingCharge = 30;
    this.rest.getCart(this.user.userid,this.user.previlage).subscribe(result => {
      this.cartList = result.arrayData;
      this.subTotal = this.rest.toDecimalNumber(result.grandTotal);
      this.grandTotal = this.rest.toDecimalNumber(result.grandTotal+this.shippingCharge);
    }, (err) => {
      console.log(err);     
    });
  }

  getImagePath(image){
    return localStorage.getItem('serverPath')+"/suc-manage/"+image;
  }

  toDecimalNumber(num){
    return this.rest.toDecimalNumber(num);
  }
  
  dismiss() {
   let data = {'foo': 'bar' };
   this.viewCtrl.dismiss(data);
 }

 removeItem(item, index){
  this.cartList.splice(index, 1);
}

getDiscount(item){
  if(!item.dblDiscount)
    item.dblDiscount = 0;
  return this.rest.toDecimalNumber(item.dblDiscount);
}

getTotal(){
  let total = 0;
  let discountAmt = 0;
  for (let data of this.cartList){
    let discount = this.getDiscount(data);
    discountAmt += discount;
    total += (data.regular_price * data.quantity)-discount;
  }
  this.totalDiscount = this.rest.toDecimalNumber(discountAmt);
  this.subTotal = this.rest.toDecimalNumber(total);
  this.grandTotal = this.subTotal + (parseFloat(this.shippingCharge));
}

getGrandTotal(){
  this.grandTotal = this.rest.toDecimalNumber(parseFloat(this.subTotal) + (parseFloat(this.shippingCharge)));
}

getSubTotal(item){
  let discount = this.getDiscount(item);
  return this.rest.toDecimalNumber((item.regular_price*item.quantity)-discount);
}

discountPopUp(item, error='') {
  if(this.user.previlage != "Salesman")
    return;

  if(error == '')
    error = "Maximum "+ (item.sales_commission*item.quantity);

  let alert = this.alertMenu.create({
    title: item.product_name,
    message: error,
    inputs: [
    {
      name : "discount",
      placeholder : "Up to "+(item.sales_commission*item.quantity),
      type : 'number',
      value: item.dblDiscount       
    }
    ],
    buttons: [
    {
      text: 'Cancel',
      handler: data => {
        console.log('Cancel clicked');
      }
    },
    {
      text: 'OK',
      handler: data => {
        Object.keys(data).forEach(marks => {
          let discount = parseFloat(data[marks]);
          if(isNaN(discount))
            this.discountPopUp(item,"Invalid Amount");
          else if(discount>item.sales_commission)
            this.discountPopUp(item,"Discount should be less than or equal to "+(item.sales_commission*item.quantity));
          else if(discount<0)
            this.discountPopUp(item,"Enter valid Amount");
          else{
            item.dblDiscount = this.rest.toDecimalNumber(data[marks]);
            this.getTotal();
          }
        });
      }
    }
    ]
  });
  alert.present();
}

loadCheckOut(){
  //create an array for passing all data to the server 

  let arrayProdCartId = [];
  let arrayProdId = [];
  let arrayProdName = [];
  let arrayProdPrice = [];
  let arrayProdQuantity = [];
  let arrayProdDiscount = [];        
  let arrayProdTotal = [];
  let totalCommission = 0; 

  for (let data of this.cartList){
    let discount = this.getDiscount(data);
    totalCommission += data.sales_commission;
    totalCommission -= discount;
    arrayProdCartId.push(data.cartId);
    arrayProdId.push(data.product_id);
    arrayProdName.push(data.product_name);
    arrayProdPrice.push(data.regular_price);
    arrayProdQuantity.push(data.quantity);
    arrayProdDiscount.push(discount);
    arrayProdTotal.push((data.regular_price*data.quantity)-discount);
  }

  let data = new FormData();
  data.append('arrCount',arrayProdCartId.lenght);
  data.append('userID', this.user.userid);
  data.append('arrayProdId', arrayProdId);
  data.append('arrayProdCartId', arrayProdCartId);
  data.append('arrayProdPrice', arrayProdPrice);
  data.append('arrayProdQuantity', arrayProdQuantity);
  data.append('arrayProdDiscount', arrayProdDiscount);
  data.append('grantTotalAmt', this.grandTotal);
  data.append('totalCommission', totalCommission);
  data.append('shpCharge', this.shippingCharge);

  // send booking info
  let loader = this.loadingCtrl.create({
    content: "Please wait..."
  });

  loader.present();
  this.rest.saveCartDetails(data).subscribe(result => {
    this.navCtrl.push(CheckoutPage, {cartDetails : this.cartList,total : this.grandTotal,shipping : this.shippingCharge});
    loader.dismiss();
  }, 
  (err) => {
    console.log(err);  
    loader.dismiss();   
  });

}

}