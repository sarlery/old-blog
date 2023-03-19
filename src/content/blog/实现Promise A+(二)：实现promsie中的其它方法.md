---
author: Mh
pubDatetime: 2020-08-08T11:28:33Z
title: 手动实现 PromiseA+（二）：实现 promsie 中的其它方法
postSlug: manual-implementation-promise-2
featured: false
draft: false
tags:
    - JavaScript
    - 前端
ogImage: ""
description: "Promise 原理和实现"
---
## Promise 的其他 API 实现
`then` 方法基本就是 promise 的全部内容，至于 `catch`、`resolve`、`reject` 等方法都是在原有的基础上做的扩展或者封装，这些方法并不算是 promise 的核心。下面就一一实现这些方法。  

### catch 

`catch` 是 promise 实例上的方法，添加一个拒绝态的回调到当前 promise，然后返回一个新的 promise。实现如下：  

```js
catch(errCbs){
    return this.then(null, errCbs);
}
```

### resolve 与 reject
这两个方法是 Promise 的静态方法。`resolve` 返回一个 Promise 对象，这样就能将该值以 Promise 对象形式使用；`reject` 返回一个状态为失败的 Promise 对象，并将给定的失败信息传递给对应的处理方法。  

它们的实现如下：  

```js
static resolve(value){
    return new Promise((resolve, reject) => {
        resolve(value);
    });
}

static reject(reason){
    return new Promise((resolve, reject) => {
        reject(reason);
    });
}
```

`resolve` 函数比较特别，例如：  

```js
// resolve 函数可以嵌套，多层 resolve，会以最内层的值为准
//（最内层也可以是 reject，这样会走失败态）
Promise.resolve(
    Promise.resolve(
        Promise.resolve(1)
    )
).then(d => {   // d: 1
    console.log('d: ', d);
}, e => console.log('e == ', e));
```

这时就要改造一下 `constructor` 中的 `resolve` 函数，需要判断传入的 `value` 是不是一个 promise。  

```js
constructor(exector){
    var reject = (reason) => {
        // ...
    };
    var resolve = (value) => {
        if(value instanceof Promise){
            return value.then(resolve, reject);
        }
        // ...
    };
}
```
### finally
`finally` 是 promise 实例上的方法，它可以传入一个回调函数，无论成功还是失败这个回调都会去执行。finally 回调参数可以返回一个 promise，如果是成功的 promise，会采用上一次的结果，如果是失败的 promise，会采用这一次的失败结果，并把结果传入 catch 中（或 then 的第二个回调参数）。`finally` 最终也是返回新的 promise 实例，例如：  

```js
new Promise ((resolve, reject) => {
    resolve(1);     // 首次成功
}).finally(() => {
    return new Promise((resolve) => {
        resolve(100);   // 返回成功的 promise
    });
}).then(d => {      // d == 1
    // 采用上一次的结果（1），而不是 100
    console.log('d == ', d);
}).catch(err => {
    console.log('err', err);
});

// 失败情况：

new Promise ((resolve, reject) => {
    reject(1);      // 首次
}).finally(() => {
    return new Promise((resolve, reject) => {
        reject(100);    // 失败的 promise
    });
}).then(d => {
    console.log('d == ', d);
}).catch(err => {   // err 100
    console.log('err', err);
    // 采用当前的失败数据
});
```

`finally` 方法实现如下：  

```js
finally(cb){
    return this.then(val => {
        return Promise.resolve(cb()).then(() => val);
    }, err => {
        return Promise.resolve(cb()).then(() => { throw err });
    });
}
```
上面的代码可能会有些困惑，成功与失败的回调都是在一个 then 中调用的，为何失败时会是新的值，而成功时会是上一次的值？成功时的回调很容易理解，失败回调是这么回事：`cb` 在执行时，因为是失败态，因此不会走后面 `.then` 的第一个回调，而是走失败的回调，这与下面的代码相似：

```js
Promise.resolve(
    new Promise((resolve, reject) => {
        reject(100);	// 失败了
    })
).then(res => {
    throw res;
}).then(res => {
    console.log('res == ', res);
}, err => {		// 成功态不会执行，而是执行失败态
    console.log('err == ', err);	// err == 100
})
```

### all

all 是一个静态方法，接受一个迭代器，返回 promise 实例，此实例在迭代所有的 promise 都完成（resolved）或参数中不包含 promise 时回调完成（resolve）；如果参数中 promise 有一个失败（rejected），此实例回调失败（reject），失败的原因是第一个失败 promise 的结果。实现如下：  

```js
static all(iterable){
    return new Promise((resolve, reject) => {
        let orderIdx = 0;
        let resultArr = [];

        for(let i = 0;i < iterable.length;i ++){
            let value = iterable[i];
            this.resolve(value).then(res => {
                resultArr[i] = res;
                orderIdx ++;
                if(orderIdx === iterable.length){
                    resolve(resultArr);
                }
            },err => {
                reject(err);
            });
        }
    });
}
```

测试：  

```js
let p1 = Promise.resolve(1);
let p2 = Promise.reject(2);
let p3 = Promise.resolve(3);

Promise.all([p1,p2,p3,4]).then(result => {
    console.log('result: ', result);
},err => {      // err: 2
    console.log('err: ', err);
});
```

### race

`race` 也是一个静态方法，它也接受一个迭代器，返回一个 promise，一旦迭代器中的某个 promise 解决或拒绝，返回的 promise 就会解决或拒绝。  

实现：  

```js
static race(iterable) {
    if(!Array.isArray(iterable)){
        throw TypeError(`${iterable} is not an array`);
    }
    let Constructor = this;
    return new Constructor((resolve, reject) => {
        for(let i = 0;i < iterable.length;i ++){
            Constructor.resolve(iterable[i]).then(resolve,reject);
        }
    });
}
```

## 最后
Promise 是解决异步回调问题的利器，使用 promise 可以把嵌套式的函数调用写成链式调用，有利于代码的阅读，有了 promise，我们可以把很多异步函数封装成 promise 风格的函数。比如 `Node` 中的 `promisify` 方法，它传入一个遵循常见的错误优先的回调风格的函数（即以 (err, value) => ... 回调作为最后一个参数），并返回一个返回 promise 的版本。例如：

```js
const utils = require('util');
const fs = require('fs');
const readFile = utils.promisify(fs.readFile);

readFile('./util.js', { encoding: 'utf-8' }).then(data => {
    console.log(data);
}).catch(err => {
    console.log(err);
});
```

### 实现 promisify 函数
代码如下：

```js
function promisify(fn){
    return (...args) => {
        return new Promise((resolve, reject) => {   
            fn(...args, (err, result) => {
                if(err) reject(err);
                else resolve(result);
            });
        });
    }
}
```

resolve 函数只能传入一个值，因此对应返回多个参数的回调函数，promisify 是不能转换的，同时还要注意进行转换的函数是否包含 this 的引用。  

我们实现的 then 方法是使用 setTimeout 实现的，它是宏任务的一个异步函数，而 ES6 中的 `then` 方法是内部是微任务实现的。典型的例子如下：  

```js
function loop(){
    console.log(111);
    Promise.resolve().then(loop);
}
loop();
```
这段代码如果是 ES6 中的 promise，在浏览器中运行时会发现页面将崩溃，这是因为微任务在执行时会把微任务队列中的任务全部执行完，上面代码显然是执行不完的，因为每次调用完 then 后，又会递归调用 `then`，微任务队列永远清不空！而如果是宏任务实现的 `then` 方法，因为宏任务队列一次只执行一个任务，因此上面的代码会像计时器一样一直执行，但不会造成死循环，每次执行一个宏任务后，浏览器会转而执行其他的任务，比如微任务、页面渲染。如果要用微任务实现 promise，可以用浏览器端的 `MutainObserver`  或者 `Node` 中的 `process.nextTick`


###### 上一篇：[实现Promise A+(一)：实现 then 方法](/posts/manual-implementation-promise-1)
