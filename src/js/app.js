import dotenv from 'dotenv';

dotenv.config();

import '../scss/main.scss';

const client = contentful.createClient({
  space: process.env.SPACE_ID,
  accessToken: process.env.API_KEY,
});

const cartBtnEl = document.querySelector(`.cart-btn`);
const closeCartBtnEl = document.querySelector(`.close-cart`);
const clearCartBtnEl = document.querySelector(`.clear-cart`);
const cartDOMEl = document.querySelector(`.cart`);
const cartOverlayEl = document.querySelector(`.cart-overlay`);
const cartItemsEl = document.querySelector(`.cart-items`);
const cartTotalEl = document.querySelector(`.cart-total`);
const cartContentEl = document.querySelector(`.cart-content`);
const productsDOMEl = document.querySelector(`.products-center`);

let cart = [];
let buttonsDOM = [];

class Products {
  async getProducts() {
    try {
      const contentful = await client.getEntries({
        content_type: process.env.CONTENT_TYPE_ID,
      });

      let products = contentful.items;

      products = products.map(item => {
        const { title, price } = item.fields;
        const { id } = item.sys;
        const { url: image } = item.fields.image.fields.file;

        return {
          id,
          title,
          price,
          image,
        };
      });

      return products;
    } catch (error) {
      return console.error(`💩`, error);
    }
  }
}

class UI {
  displayProducts(products) {
    let result = ``;

    products.forEach(({ id, title, price, image }) => {
      result += `
			<!-- single product -->
			<article class="product">
				<div class="img-container">
					<img
						src="${image}"
						alt="Product"
						class="product-img"
					/>

					<button class="bag-btn" data-id=${id}>
						<i class="fas fa-shopping-cart"></i>
						add to cart
					</button>
				</div>

				<div class="description">
					<h3>${title}</h3>
					<h4>${price}€</h4>
				</div>
			</article>
			<!-- end of single product -->
			`;
    });

    productsDOMEl.innerHTML = result;
  }

  getBagButtons() {
    const buttons = [...document.querySelectorAll(`.bag-btn`)];

    buttonsDOM = buttons;

    buttons.forEach(button => {
      const { id } = button.dataset;
      const inCart = cart.find(item => item.id === id);

      if (inCart) {
        button.innerText = `In cart`;
        button.disabled = true;
      }

      button.addEventListener(`click`, event => {
        event.target.innerText = `In cart`;
        event.target.disabled = true;

        // get product from products
        const cartItem = { ...Storage.getProduct(id), amount: 1 };

        // add product to the cart
        cart = [...cart, cartItem];

        // save cart to local storage
        Storage.saveCart(cart);

        // set cart values
        this.setCartValues(cart);

        // display cart item
        this.addCartItem(cartItem);

        // show the cart
        this.showCart();
      });
    });
  }

  setCartValues(cart) {
    let tempTotal = 0;
    let itemsTotal = 0;

    cart.map(item => {
      tempTotal += item.price * item.amount;
      itemsTotal += item.amount;
    });

    cartTotalEl.innerText = parseFloat(tempTotal.toFixed(2));
    cartItemsEl.innerText = itemsTotal;
  }

  addCartItem({ id, title, price, image, amount }) {
    const div = document.createElement(`div`);

    div.classList.add(`cart-item`);

    div.innerHTML = `
		<!-- cart item -->
		<img src="${image}" alt="Product" />

		<div>
			<h4>${title}</h4>
			<h5>${price}€</h5>
			<span class="remove-item" data-id=${id}>remove</span>
		</div>

		<div>
			<i class="fas fa-chevron-up" data-id=${id}></i>
			<p class="item-amount">${amount}</p>
			<i class="fas fa-chevron-down" data-id=${id}></i>
		</div>
		<!-- end of cart item -->
		`;

    cartContentEl.appendChild(div);
  }

  showCart() {
    cartOverlayEl.classList.add(`transparentBcg`);
    cartDOMEl.classList.add(`showCart`);
  }

  setupApp() {
    cart = Storage.getCart();
    this.setCartValues(cart);
    this.populateCart(cart);

    cartBtnEl.addEventListener(`click`, this.showCart);
    closeCartBtnEl.addEventListener(`click`, this.hideCart);
  }

  populateCart(cart) {
    cart.forEach(item => this.addCartItem(item));
  }

  hideCart() {
    cartOverlayEl.classList.remove(`transparentBcg`);
    cartDOMEl.classList.remove(`showCart`);
  }

  cartLogic() {
    // clear cart button
    clearCartBtnEl.addEventListener(`click`, () => {
      this.clearCart();
    });

    // cart functionality
    cartContentEl.addEventListener(`click`, event => {
      if (event.target.classList.contains(`remove-item`)) {
        const removeItem = event.target;
        const { id } = removeItem.dataset;

        // remove from DOM, moving two parents up
        cartContentEl.removeChild(removeItem.parentElement.parentElement);

        // remove from cart
        this.removeItem(id);
      } else if (event.target.classList.contains(`fa-chevron-up`)) {
        const addAmount = event.target;
        const { id } = addAmount.dataset;

        // update item count
        const tempItem = cart.find(item => item.id === id);
        tempItem.amount += 1;
        Storage.saveCart(cart);
        this.setCartValues(cart);

        // more DOM traversing
        addAmount.nextElementSibling.innerText = tempItem.amount;
      } else if (event.target.classList.contains(`fa-chevron-down`)) {
        const lowerAmount = event.target;
        const { id } = lowerAmount.dataset;

        // update item count
        const tempItem = cart.find(item => item.id === id);
        tempItem.amount -= 1;

        // only update when above zero, else remove
        if (tempItem.amount > 0) {
          Storage.saveCart(cart);
          this.setCartValues(cart);

          // more DOM traversing
          lowerAmount.previousElementSibling.innerText = tempItem.amount;
        } else {
          cartContentEl.removeChild(lowerAmount.parentElement.parentElement);
          this.removeItem(id);
        }
      }
    });
  }

  clearCart() {
    const cartItems = cart.map(item => item.id);
    cartItems.forEach(id => this.removeItem(id));

    while (cartContentEl.children.length > 0) {
      cartContentEl.removeChild(cartContentEl.children[0]);
    }

    this.hideCart();
  }

  removeItem(id) {
    cart = cart.filter(item => item.id !== id);
    this.setCartValues(cart);
    Storage.saveCart(cart);

    const button = this.getSingleButton(id);
    button.disabled = false;
    button.innerHTML = `<i class="fas fa-shopping-cart"></i>add to cart`;
  }

  getSingleButton(id) {
    return buttonsDOM.find(button => button.dataset.id === id);
  }
}

class Storage {
  static saveProducts(products) {
    localStorage.setItem(`products`, JSON.stringify(products));
  }

  static getProduct(id) {
    const products = JSON.parse(localStorage.getItem(`products`));
    return products.find(product => product.id === id);
  }

  static saveCart(cart) {
    localStorage.setItem(`cart`, JSON.stringify(cart));
  }

  static getCart() {
    return localStorage.getItem(`cart`)
      ? JSON.parse(localStorage.getItem(`cart`))
      : [];
  }
}

document.addEventListener(`DOMContentLoaded`, () => {
  const ui = new UI();
  const products = new Products();

  // set up app
  ui.setupApp();

  // get all products
  products
    .getProducts()
    .then(products => {
      ui.displayProducts(products);
      Storage.saveProducts(products);
    })
    .then(() => {
      ui.getBagButtons();
      ui.cartLogic();
    });
});
