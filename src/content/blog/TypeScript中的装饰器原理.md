---
author: Mh
pubDatetime: 2023-06-11T07:13:19Z
title: TypeScript中的装饰器原理
postSlug: TypeScriptDecorator
featured: true
draft: false
tags:
    - TypeScript
    - 语言特性
    - 装饰器
ogImage: ""
description: "认识一下TypeScript中的装饰器使用和实现"
---

## 定义、分类

### 定义  
装饰器本质上就是一个函数，可以“注入”到类、方法、属性、对象上，用于扩展其功能。  

分类：
- 类装饰器
- 属性装饰器
- 方法装饰器
- 方法的参数装饰器
- 元数据装饰器


装饰器通常有两种写法：

1. 调用时不传递参数的装饰器；
2. 装饰器工厂，调用时可以传递参数的装饰器；

以 Mobx 为例，它支持了多种装饰器功能。

```ts
import { observable, action, makeObservable } from 'mobx';

class Store {
  @observable count = 0;	// 属性装饰器

  @actoin // 属性装饰器
  public setCount = (count: number) => {
    this.count = count;
  }
    constructor() {
    makeObservable(this);
  }
}

// 调用时不传递参数的装饰器
import { observer } from 'mobx-react';
@observer	// 类装饰器
class Component {
  // todo
}
```

在  `Redux` 中的 `connect` 函数就是一个装饰器工厂，它可以把 `state` 和 `dispatch` 注入到组件的 `props` 中。当然，目前 Redux 推荐使用函数组件和 hooks，connect API 主要用于 class component。  

```ts
class MyReactComponent extends React.Component {}
export default connect(mapStateToProps, mapDispatchToProps)(MyReactComponent);

// 装饰器语法（类装饰器）
@connect(mapStateToProps, mapDispatchToProps)
class MyReactComponent extends React.Component {}
export default MyReactComponent;
```

### 装饰器执行顺序

当一个类中定义了多种装饰器时，执行顺序为：
1. 先执行属性装饰器；
2. 然后执行方法参数装饰器；
3. 之后执行方法装饰器；
4. 执行构造器参数装饰器；
5. 最后执行类装饰器；


当某个同一个类/方法/方法参数/属性上存在多个装饰器时，则会先执行离其最近的装饰器，或者说是“从下往上”执行。比如下面的属性装饰器，执行顺序是：`c -> b -> a`。
```ts
class D {
  @a
  @b
  @c
  num = 0;
}
```
当有多个方法装饰器和方法参数装饰器时，会先执行某个方法的参数装饰器，然后执行它的参数装饰器。之后开始执行下一个方法的装饰器和其相关的参数装饰器，都执行完毕后才会执行构造器参数装饰器。

### 在项目中使用装饰器

装饰器是一个很新的语法，目前还处于提案的状态（Stage-3），浏览器还都不支持该功能，ts 和 babel 默认使用的是 stage-2 版本的装饰器，因此要使用装饰器就需要编译工具转换成支持的语法。

#### Babel 支持装饰器

用 Babel 编译装饰器可以使用 `@babel/plugin-proposal-decorators` 和  `@babel/plugin-proposal-class-properties` 这两个插件。  

```ts
module.exports = {
  plugins: [
    // legacy=true 会启用 stage-1 的装饰器语法和行为。
    ["@babel/plugin-proposal-decorators", { legacy: true }],
    "@babel/plugin-proposal-class-properties"
  ]
}
```
#### TypeScript 支持装饰器

在 TS 中使用装饰器只需要在 tsconfig.json 中打开下面的配置即可。

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
  }
}
```

如果你还想在项目中使用 reflect-metadata 包编写元数据装饰器，还需要打开 `emitDecoratorMetadata` 选项，让 TS 支持元数据装饰器。

## 使用装饰器

无论是那种装饰器，其本质就是一个函数，区别是他们的参数可能不一样。不同装饰器的函数签名：
```ts
/** 属性描述 */
interface TypedPropertyDescriptor<T> {
    enumerable?: boolean;
    configurable?: boolean;
    writable?: boolean;
    value?: T;
    get?: () => T;
    set?: (value: T) => void;
}

/** 类装饰器 */
declare type ClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;
/** 属性装饰器 */
declare type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void;
/** 方法装饰器 */
declare type MethodDecorator = <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
/** 函数参数装饰器 */
declare type ParameterDecorator = (target: Object, propertyKey: string | symbol, parameterIndex: number) => void;
```

### 类装饰器
类装饰器用于修饰一个类。它的参数是类本身，隐藏可以在装饰器函数内部对类做一些改动。
```ts
const classDecorator: ClassDecorator = (targetClass) => {
  // ...
}

@classDecorator
class MyClass {}
```

类装饰器的返回值可以是一个新的类，且这个类应继承 targetClass。当被修饰的类实例化时实际实例化的是装饰器返回的那个类，因此可以使用类装饰器在类实例化时做一下拦截，比如重写原始类的一些方法。
```ts
/** 泛型工厂类 */
const logger = <T extends new (...args: any[]) => any>(Target: T) => {
    class NewClass extends Target {
        constructor(...args: any[]) {
            super(...args);
            console.log('类被实例化了：', Target.name, args);
        }
        // 重写方法
        getName() {
          return this.name;
        }
    }
    return NewClass;	// 把子类返回出去
}

@logger
class Person {
    constructor(public name: string, public age: number) {

    }
  	getName() {
          return 'My name is' + this.name;
      }
}
// 创建实例时其实是实例化了 NewClass 这个类
const person = new Person('ming', 18);
```
TS 是内部是怎么实现呢？上面的代码会被 typescript 编译成下面的 js 代码：
```js
/** 泛型工厂类 */
var logger = function (Target) {
    var NewClass = /** @class */ (function (_super) {
        __extends(NewClass, _super);	// 继承
        function NewClass() {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            var _this = _super.call(this, args) || this;
            console.log('类被实例化了：', Target.name, args);
            return _this;
        }
        return NewClass;
    }(Target));
    return NewClass;
};
var Person = /** @class */ (function () {
    function Person(name, age) {
        this.name = name;
        this.age = age;
    }
    // __decorate 返回的类赋值给 Person
    Person = __decorate([
        logger,
        __metadata("design:paramtypes", [String, Number])
    ], Person);
    return Person;	// 把 Person 返回出去
}());
// 执行时会输出 log ——> 类被实例化了： Person [ 'ming', 18 ]
var person = new Person('ming', 18);
很显然 __decorate 这个 helper 函数是实现装饰器的核心函数。
var __decorate =
  (this && this.__decorate) ||
  /**
   * 
   * @param {Function[]} decorators 装饰器函数数组（函数集合）
   * @param {ClassFunction|object} target 被装饰的类，当不是类装饰器时，target 是类的原型对象(prototype)
   * @param {string | symbol} key 被修饰属性/方法的名称，通常是一个字符串，也可以是 symbol
   * @param {TypedPropertyDescriptor|number} desc 如果是方法装饰器则是属性描述符，如果是参数装饰器，则是参数索引
   * @returns {void | TypedPropertyDescriptor | ClassFunction}
   * 返回值可能是一个子类，或者属性描述符，后面两个参数是可选的，不同的装饰器参数可能不一样
   */
  function (decorators, target, key, desc) {
    /** 拿到参数长度 */
    var c = arguments.length,
    /** r 是最终的返回值 */
      r =
        c < 3
          ? target  // 参数长度小于 3，说明是类装饰器或属性装饰器
          : desc === null   // 长度大于 3，判断一下有没有传属性描述符，没有就获取一下默认的
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,   // r 可能是方法装饰器或参数装饰器
      d;    // d 对应某个装饰器
    /** 是不是 metadata 装饰器 */
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function")
      r = Reflect.decorate(decorators, target, key, desc);
    /**
     * 如果不是 metadata 装饰器，则遍历装饰器函数数组，类或者属性/方法等可以被多个装饰器修饰，因此是一个数组
     * 从后往前遍历，说明会先执行最“下”方（最靠近被修饰方）的装饰器
     */
    else 
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))    // 赋值
            /**
             * 继续判断参数长度执行不同的装饰器函数
             * c < 3，即只有一个 target 参数，是一个类装饰器，把 r 传进去（r 初始值是 target）即可
             * r > 3，说明是方法/参数装饰器，把 target、key 和 r（r 初始值是 desc）传进去
             * r === 2，说明是属性装饰器，把 target 和 key 传进去即可
             * 最后把装饰器之行后的结果赋值给 r
             */
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    /** 如果长度大于 3，并且 r 有值（参数装饰器没有返回值，即 r 是 void），说明是方法装饰器，需要更改属性描述符，最后返回 r */
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
```

### mobx-react 中的 inject 装饰器
`mobx-react` 中有一个 inject 函数，可以把 store 注入到组件的 props 中，对于 class component，inject 就是一个类装饰器工厂函数，可以接收 storeNames，然后返回类装饰器函数，其内部实现大致如下：  

```ts
export function inject(/* fn(stores, nextProps) or ...storeNames */ ...storeNames: Array<any>) {
  // 返回装饰器函数，参数是 ReactComponent  
  return (componentClass: React.ComponentClass<any, any>) =>
            // createStoreInjector 用于数据注入，返回新的类组件
            createStoreInjector(
                /* baseStores 是所有传入的 store 数据字典
                 * nextProps 则是使用组件时传入的 props
                */
                function (baseStores, nextProps) {
                    storeNames.forEach(function (storeName) {
                        /* 如果传入的 props 中属性名有和注入的 store 重名的，
                         * 则优先使用 nextProps 中的数据
                        */
                        if (
                            storeName in nextProps // prefer props over stores
                        )
                            return
                        if (!(storeName in baseStores))
                            throw new Error(
                                "MobX injector: Store '" +
                                    storeName +
                                    "' is not available! Make sure it is provided by some Provider"
                            )
                        /* 更新 props */
                        nextProps[storeName] = baseStores[storeName]
                    })
                    return nextProps
                },
                componentClass,
                storeNames.join("-"),
                false
            )
    }
}
```

`createStoreInjector` 函数内部会创建新的组件，把 `store` 数据注入进去：

```ts
function createStoreInjector(
    grabStoresFn: IStoresToProps,
    component: IReactComponent<any>,
    injectNames: string,
    makeReactive: boolean
): IReactComponent<any> {
    // Support forward refs
    let Injector: IReactComponent<any> = React.forwardRef((props, ref) => {
        const newProps = { ...props }
        /* 获取到全部的 store */
        const context = React.useContext(MobXProviderContext)
        /* 合并 props */
        Object.assign(newProps, grabStoresFn(context || {}, newProps) || {})

        if (ref) {
            newProps.ref = ref
        }
      	/* 根据老的组件创建出新的组件 */
        return React.createElement(component, newProps)
    })

    if (makeReactive) Injector = observer(Injector)
    Injector["isMobxInjector"] = true // assigned late to suppress observer warning

    /* 把老组件上的静态属性挂到新的组件上 */
    copyStaticProperties(component, Injector)
    Injector["wrappedComponent"] = component
    Injector.displayName = getInjectName(component, injectNames)
    return Injector
}
```

### 方法装饰器
方法装饰器的函数签名：
```ts
declare type MethodDecorator = <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
```
一个简单的方法装饰器：
```ts
const methodDecorator: MethodDecorator = (target, key, desc) => {
    console.log(target, key, desc);
}


class MethodDecoratorClass {
    constructor(public arr: number[]) {

    }
    @methodDecorator
    getArr() {
        return this.arr;
    }
}
```
上面代码会被编译成下面的 js 代码：
```js
var methodDecorator = function (target, key, desc) {
    console.log(target, key, desc);
};
var MethodDecoratorClass = /** @class */ (function () {
    function MethodDecoratorClass(arr) {
        this.arr = arr;
    }
    MethodDecoratorClass.prototype.getArr = function () {
        return this.arr;
    };
  	// 方法装饰器不需要接收返回值
    __decorate([
        methodDecorator,
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", void 0)
      // 第四个参数编译时是 null，不过 __decorate 内部会判空，
      // 是空值时会调用 getOwnPropertyDescriptor 获取默认值，然后传给装饰器函数
    ], MethodDecoratorClass.prototype, "getArr", null);
    return MethodDecoratorClass;
}());
```

方法装饰器的第三个参数 desc 属性描述符，即：用 Object.getOwnPropertyDescriptor(object, key) 方法可以获取到对象的某个属性/方法的描述信息，用 Object.defineProperty(object, key, descriptor) 方法定义某个属性的描述符。这些描述包括：

- value 该属性的值（默认 undefined）；
- writable 布尔值，是 true 时表示属性的值可写（默认 false）；
- get 获取该属性的访问器函数，获取属性的值的时候会触发（默认 undefined）；
- set 更改该属性的访问器函数，更改属性的值的时候会触发（默认 undefined）；
- configurable 值为 true 时，该属性的描述符才能够被改变，同时该属性也可以被删除（默认 false）；
- enumerable 是否可以在 for...in 循环和 Object.keys() 中被枚举（默认 false）；

默认值代表的是用 `defineProperty` 创建一个对象时的默认值，用对象字面量创建的对象的属性描述符并不是这样的（而是可写、可读、可遍历、可删除、value有值）
详细用法可参考 MDN 文档：

1. [getOwnPropertyDescriptor](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/getOwnPropertyDescriptor)
2. [defineProperty](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)

```ts
const person = {name: 'ming'};
const p1 = Object.getOwnPropertyDescriptor(person, 'name');
const p2 = Object.getOwnPropertyDescriptor(person, 'name');
console.log(p1 === p2);	// false，两个对象对应的地址空间是不同的
p1.value = 'xxx';	// 更改属性值
console.log(person.name);	// 获取值发现还是 'ming'

// 如果要应用改动，需要使用 defineProperty
Object.defineProperty(a, 'name', p1);
console.log(person.name);	// xxx
```
### 前置拦截和后置拦截
当在被修饰的方法之前前运行装饰器的内容成为前置拦截；后置拦截则是在执行完方法后做的拦截。
实现思路是更改属性描述符的 value 对应的值，然后返回改写后的描述符。`__decorate` 函数内部会调用 `defineProperty`，把新的描述符更新到类的原型对象上。
```ts
const methodDecorator = (target: object, key: string, desc: TypedPropertyDescriptor<any>) => {
    /** 获取原始的方法，会直接运行代码在类还没实例化之前 */
    const originMethod = desc.value as Function;
    console.log('实例未创建之前直接被调用：', target, key, desc);	// 1
    /** 复制新的方法，当在类中调用该方法时，该函数会被执行 */
    desc.value = function(...args: any[]) {
        /* 前置拦截 */
        const strArr = args.filter(item => typeof item === 'string');
        console.log('string items: ', strArr);							// 2
        /** 调用原始的方法 */
        const result = originMethod.apply(this, args);
        /* 以下是后置拦截 */
        console.log('origin items: ', result);							// 3
        const numArr = args.filter(item => typeof item === 'number');
        console.log('number items: ', numArr);							// 4
    }
    /** return 出去，表示要更新属性描述符 */
    return desc;
}

class MethodDecoratorClass {
    constructor() {

    }

    @methodDecorator
    getArr(...items: (number | string)[]) {
        return items;
    }
}
const method = new MethodDecoratorClass();
method.getArr(1, 'f', 2, 'o', 3, 'o', 4, '!');
// 按照 1、2、3、4 的顺序打印结果
需要注意的是，ES6 的类定义方法时也可以用箭头函数来定义：
class Person {
	name = 'ming';
  age = 18;

  getAge() {
    return this.age;
  }
  getName = () => this.name;
}
```
上面的代码 `getAge` 和 `getName` 虽然都是函数，但是他们“挂载”的位置是不同的，`getAge` 会被放到类的原型(prototype)上，而 `getName` 则会是类实例化对象上的一个属性。下面是编译后的 js 代码。
```js
var Person = /** @class */ (function () {
    function Person() {
        var _this = this;
        this.name = 'ming';
        this.age = 18;
        this.getName = function () {
            return _this.name;
        };
    }
    Person.prototype.getAge = function () {
        return this.age;
    };
    return Person;
}());
```
而方法装饰器修饰的是类原型上的方法，当用方法修饰器修饰 `getName` 函数时 TS 会报错，它会让你使用属性装饰器。
### 属性装饰器
属性装饰器与方法装饰器相比，没有属性描述符，只接收原型对象和属性名称两个参数。
```ts
declare type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void;
```
在 mobx 中可以使用属性装饰器创建一个 `observable` 数据：
```ts
import { observable, action, makeObservable } from 'mobx';

class MyStore {
    @observable count = 0;

    @action setCount = (num: number) => {
        this.count = num;
    }

    constructor() {
        makeObservable(this);
    }
}
```
编译后的代码：
```js
var mobx_1 = require("mobx");
var MyStore = /** @class */ (function () {
    function MyStore() {
        var _this = this;
        this.count = 0;
        this.setCount = function (num) {
            _this.count = num;
        };
        (0, mobx_1.makeObservable)(this);
    }
    __decorate([
        mobx_1.observable,
        __metadata("design:type", Object)
    ], MyStore.prototype, "count", void 0);
    __decorate([
        mobx_1.action,
        __metadata("design:type", Object)
    ], MyStore.prototype, "setCount", void 0);
    return MyStore;
}());
```

### 方法参数装饰器
签名：
```ts
/**
 * 方法参数装饰器
 * @param target 原型对象
 * @param key 方法名
 * @param paramIndex 参数的索引
 */
declare type ParameterDecorator = (target: Object, propertyKey: string | symbol, parameterIndex: number) => void;
```
使用：
```ts
// paramIndex
const paramsDecorator: ParameterDecorator = (target, key, paramIndex) => {
    console.log('ParameterDecorator: ', target, key, paramIndex);
}

class ParamsDecorator {
    eat (@paramsDecorator food: string) {

    }
}
```
编译后的代码：
```js
// __param helper 函数内部会返回一个属性装饰器
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var paramsDecorator = function (target, key, paramIndex) {
    console.log('ParameterDecorator: ', target, key, paramIndex);
};
var ParamsDecorator = /** @class */ (function () {
    function ParamsDecorator() {
    }
    ParamsDecorator.prototype.eat = function (food) {
    };
    __decorate([
        // 根据 __param 函数获取到 decorator 函数
        __param(0, paramsDecorator),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String]),
        __metadata("design:returntype", void 0)
    ], ParamsDecorator.prototype, "eat", null);
    return ParamsDecorator;
}());
```
上面代码可以发现，方法参数装饰器本质上是对属性装饰的封装。
### 构造器参数装饰器
构造器参数装饰器与普通的方法参数器有点区别。比如下面的代码：
```ts
const constructorParamDecorator: ParameterDecorator = (target, key, paramIndex) => {
    console.log('ParameterDecorator: ', target, key, paramIndex);
}
class ParamsDecorator {
    constructor(@constructorParamDecorator a1: number[]) {
      // ...  
    }
}
```
编译成 js 代码则是：
```js
var ParamsDecorator = /** @class */ (function () {
    function ParamsDecorator(a1) {
    }
    ParamsDecorator = __decorate([
        __param(0, constructorParamDecorator),
        __metadata("design:paramtypes", [Array])
    ], ParamsDecorator);	// 给装饰器只传了一个类，而不是类的原型对象
    return ParamsDecorator;
}());
```
可以发现构造器参数装饰器编译后，`__decorate` 只有两个参数：装饰器数组和类。因此构造器装饰器的第二个参数 key 将是 undefined，第一个参数不是原型对象，而是类本身。这和类装饰很类似。
当同一个方法中不同的参数都有对应的参数装饰器时，执行顺序是“从左往右”的顺序，索引值从低到高的去执行。
### 元数据装饰器
元数据是指附加在对象、类、方法、属性、参数上的数据。使用元数据可以帮助提供实现某种业务功能需要用到的数据。
使用元数据装饰器需要在 `tsconfig.json` 中开启 `emitDecoratorMetadata` 选项，还需要安装 `reflect-metadata` 包。
```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
  }
}
```
```shell
yarn add reflect-metadata -S
```
使用：
```ts
import 'reflect-metadata';
// 内部提供的方法直接挂载到了 Reflect API 上，直接使用即可
Reflect.defineMetadata('path', {}, {});
```
#### API
```ts
// 签名：
// 定义元数据
function defineMetadata(metadataKey: any, metadataValue: any, target: Object): void;
function defineMetadata(metadataKey: any, metadataValue: any, target: Object, propertyKey: string | symbol): void;
// 获取元数据
function getMetadata(metadataKey: any, target: Object): any;
function getMetadata(metadataKey: any, target: Object, propertyKey: string | symbol): any;
// 是否含有元数据
function hasOwnMetadata(metadataKey: any, target: Object): boolean;
function hasOwnMetadata(metadataKey: any, target: Object, propertyKey: string | symbol): boolean;

// 为类或者对象上定义元数据
Reflect.defineMetadata(metaKey, metaValue, targetClassOrObject);
// 为方法定义元数据
Reflect.defineMetadata(metaKey, metaValue, targetPrototype.methodName);
// 为属性定义元数据
Reflect.defineMetadata(metaKey, metaValue, targetPrototype.propertyKey);
/** 获取类上定义的元数据的 keys 数组 */
console.log(Reflect.getMetadataKeys(Person));
/** 获取类原型上定义的元数据的 keys 数组 */
console.log(Reflect.getMetadataKeys(Person.prototype, 'eat'));
/** 获取类自身定义的元数据的 keys */
console.log(Reflect.getOwnMetadataKeys(Person));
/** 获取类自身原型上定义的元数据的 keys */
console.log(Reflect.getOwnMetadataKeys(Person.prototype, 'eat'));

// 🌰
const obj = {
    username: 'zhangsan',
    age: 23,
    info() {
      console.log('info');
    }
};

Reflect.defineMetadata('key', '这是一条元数据', obj);
const data = Reflect.getMetadata('key', obj);	// 获取元数据
console.log(data);	// '这是一条元数据'

Reflect.defineMetadata('method:key', '方法元数据', obj, 'info');
const methodMetadata = Reflect.getMetadata('method:key', obj, 'info');
console.log(methodMetadata);	// '方法元数据'
```
也可以给类定义元数据：
```ts
@Reflect.metadata('desc', 'People 类元数据')
class People {
    @Reflect.metadata('desc', '姓名需要是个汉字')
    username = '张三';

    @Reflect.metadata('info', '吃饭')
    eat(food: string) {
        console.log(this.username, '吃了', food);
    }
}
class ChinesePeople extends People {}

// 获取元数据
console.log(Reflect.getMetadata('desc', People));
// username 属性不在原型上，但可以从原型上获取到元数据
console.log(Reflect.getMetadata('desc', People.prototype, 'username'));
console.log(Reflect.getMetadata('info', People.prototype, 'eat'));

// 有没有元数据（子类可以继承父类的）
console.log(Reflect.hasMetadata('desc', ChinesePeople));	// true
// 自身有没有元数据
console.log(Reflect.hasOwnMetadata('desc', ChinesePeople));	// false
内置的 key
'design:type'、'design:returntype'、'design:paramtypes' 主要用于获取类型数据。需要注意的是应明确定义出类型，不然获取到的类型可能不准确。
class People {
  @Reflect.metadata('desc', '姓名需要是个汉字')
    username: string = '张三';

    @Reflect.metadata('info', '吃饭')
    eat(food: string, drink: string): boolean {
        console.log(this.username, '吃了', food);
        return true;
    }
}
// TS 编译后的代码：
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
__decorate([
    Reflect.metadata('desc', '姓名需要是个汉字'),
    __metadata("design:type", String)
  ], People.prototype, "username", void 0);
__decorate([
  Reflect.metadata('info', '吃饭'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Boolean)
], People.prototype, "eat", null);

// design:type 会获取元数据的类型（[Function: String]）
Reflect.getMetadata('design:type', People.prototype, 'username');
// design:returntype 获取元数据的返回值类型（[Function: Boolean]）
Reflect.getMetadata('design:returntype', People.prototype, 'eat');
// design:paramtypes 获取函数参数类型（[ [Function: String], [Function: String] ]）
Reflect.getMetadata('design:paramtypes', People.prototype, 'eat');
```
### 装饰器工厂
装饰器工厂也是一个函数，这个函数内部会返回一个装饰器函数。
```ts
/** 装饰器工厂 */
function decoratorFactory(log: string) {
    console.log('-- log --', log);
    return function (target) {		// 工厂函数内部返回装饰器函数
        console.log('target', target);
    } as ClassDecorator;
}

@decoratorFactory('hello world')
class FactoryClass {

}
```
## Nest.js 中的装饰器

`Nest.js` 是一个 Node.js 后端框架，底层默认使用 Express 框架构建。Nest.js 中的几个关键术语：
- `Controller`，控制器，目的是接收应用程序的特定请求，每个控制器都有多个路由，不同的路由可以执行不同的动作；
- `Module`，用于组织应用程序，每个应用程序至少有一个模块，根模块是 Nest 用来构建应用程序图的起点，Nest 中使用 @Module 装饰器描述模块；
- `Provider`，常用的 Services 就是一个 Provider，它主要运用了依赖注入的思想，让对象之间创建各种联系；
- `Middleware`，中间件，类似于 Express 中间件，是在路由处理之前调用的函数，中间件函数可以访问请求和响应对象。下一个中间件函数通常由一个名为 next 的变量表示；
下面代码是一个有关博客文章的接口：
```ts
import { Body, Controller, Post, Get, Delete, Query, Param } from '@nestjs/common';
import { ArticleService } from './article.service';

export class ArticleData {
    title: string;
    content: string;
    author: string;
    isDraft: boolean;
}
// 文章路由控制器
@Controller('article')
export class ArticleController {
  // 依赖注入 ArticleService（一个 Provider）
  constructor(private readonly articleService: ArticleService) {}

  /** 增加文章 /article/new */
  @Post('new')
  addArticle(@Body() body: ArticleData) {
    /* 一些业务逻辑比较复杂时，就可以抽离到 ArticleService 中 */
    return this.articleService.addArticle(body);
  }

  /** 查询文章列表 /article/list */
  @Get('list')
  getList() {
    return [
        { id: 1 },
        { id: 2 },
        { id: 3 },
        { id: 4 },
    ];
  }

  /** 更新文章 /article/update?id=xxx */
  @Post('update')
  update(@Body() body: ArticleData, @Query('id') id: string) {
    return {
        id,
        code: 1,
        data: body,
        success: true,
    };
  }

  /** 删除文章 /article/del/:id */
  @Delete('del/:id')
  del(@Param('id') id: string) {
    return {
        id,
        code: 1,
        success: true,
    };
  }
}

/* article.service.ts */
import { Injectable } from '@nestjs/common';
import { ArticleData } from './article.controller';

@Injectable()
export class ArticleService {
    addArticle(body: ArticleData) {
        return body;
    }
}
```
`Article` 是应用程序的一个模块，在 Nest 中使用 `@Module` 来描述：
```ts
/* app.module.ts */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ArticleModule } from './article/article.module';
@Module({
  imports: [ArticleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

/* article.module.ts */
import { Module } from '@nestjs/common';
import { ArticleController } from './article.controller';
import { ArticleService } from './article.service';
@Module({
  controllers: [ArticleController],
  providers: [ArticleService]
})
export class ArticleModule {}
```

我们可以使用了 `reflect-metadata` 这个库实现 Nestjs 中的一些装饰器功能。各种装饰器的执行时机：
1. 先执行属性装饰器；
2. 然后执行方法参数装饰器；
3. 之后执行方法装饰器；
4. 执行构造器参数装饰器；
5. 最后执行类装饰器；

类装饰器是最后才被执行的，方法装饰器在类装饰器之前执行。可以在方法装饰器中使用 `reflect- metadata` 收集各个路由，然后再 `@Controller` 中注册路由。
首先是方法装饰器，接收 string 路由参数，返回方法装饰器，签名如下：
```ts
type Method = (path?: string) => MethodDecorator;
```
代码实现：
```ts
export type MethodType = 'get' | 'post' | 'delete' | 'put';
export type Path = Symbol('path');
export type Method = Symbol('method');

export function reqMethodDecorator(methodType: MethodType) {
  return function (path: string): MethodDecorator {
    return function (targetPrototype: Object, methodName: string | symbol) {
      Reflect.defineMetadata(Path, path, targetPrototype, methodName);
      Reflect.defineMetadata(Method, methodType, targetPrototype, methodName);
    }
  }
}

export const Get = reqMethodDecorator('get');
export const Post = reqMethodDecorator('post');
export const Put = reqMethodDecorator('put');
export const Delete = reqMethodDecorator('delete');
```

然后是 `Controller` 装饰器，这个装饰器需要从 reflect-metadata 中获取上面定义的元数据，然后遍历类的原型，找到对应的方法，把这些方法作为路由函数挂载到 `Express` 路由上。
```ts
import { Method, Path } from './const';

export function Controller(reqRootPath: string = ''): ClassDecorator {
  // 返回类装饰器函数
  return function (targetClass) {
    // 遍历类上的原型
    for (let methodName in targetClass.prototype) {
      // 从 reflect-metadata 中找到保存的路由数据
      let routerPath = Reflect.getMetadata(Path, targetClass.prototype, methodName);
      // 拿到装饰器对应的方法（get、post、delete、put）
      const methodType: MethodType = Reflect.getMetadata(Method, targetClass.prototype, methodName);
      // 拿到对应的路由函数
      const targetMethodFunc: RequestHandler = targetClass.prototype[methodName];
      // 当执行对应r outerPath 时，会自动执行 targetMethodFunc 方法
      if (routerPath && methodType && typeof targetMethodFunc === 'Function') {
        routerPath = `/${reqRootPath}/${routerPath}`.replace(/\/\//g, '/');
        // 设置路由
        router[methodType](routerPath, targetMethodFunc);
      }
    }
  }
}
```
然后是 `@Param`、`@Query`、`@Body` 等一些装饰器，用于获取 `Request` 中的数据。实现思路同样是利用 reflect-metadata 库把数据存起来，然后在 `Controller` 中进一步处理函数参数。
```ts
import 'reflect-metadata';
export type ReqProperties = 'params' | 'body' | 'query';

export const ParamsProperty = Symbol('reqProperty');

export type ReqPropertyMetadata = {
    key?: string;
    property: ReqProperties;
};
export const reqParamsDecorator = (property: ReqProperties) => {
    return (key?: string): ParameterDecorator => {
        // propertyKey 就是函数名称
        return (targetPrototype, propertyKey) => {
            /**
             * 需要注意的是，一个方法里可能注册多个 @Body、@Query、@Param。例如：
             * getList(@Body('title') title: string, @Body('content') content: string, @Query() query: object)
             * 因此需要存一个数组
             */
            const metadata: ReqPropertyMetadata[]  = Reflect.getMetadata(ParamsProperty, targetPrototype, propertyKey) || [];
            metadata.push({ property, key });
            Reflect.defineMetadata(ParamsProperty, metadata, targetPrototype, propertyKey);
        }
    }
};
export const Param = reqParamsDecorator('params');
export const Body = reqParamsDecorator('body');
export const Query = reqParamsDecorator('query');
然后是在 Controller 中获取函数参数，这些参数都是从 Request 中生成的。代码如下：
import { RequestHandler, Request, Response, NextFunction } from 'express';
import { router } from './router';
import { ReqPropertyMetadata, ParamsProperty } from './params';
import { Method, Path, Middlewares } from './const';
import { MethodType } from './types';

export function Controller(reqRootPath: string = ''): ClassDecorator {
  // 返回类装饰器函数
  return function (targetClass) {
    // 遍历类上的原型
    for (let methodName in targetClass.prototype) {
      // 从 reflect-metadata 中找到保存的路由数据
      let routerPath = Reflect.getMetadata(Path, targetClass.prototype, methodName);
      // 拿到装饰器对应的方法（get、post、delete、put）
      const methodType: MethodType = Reflect.getMetadata(Method, targetClass.prototype, methodName);
      // 获取函数参数
      const reqPropertiesMetadata: ReqPropertyMetadata[] = Reflect.getMetadata(ParamsProperty, targetClass.prototype, methodName) || [];
    	// 获取这个方法的描述符，然后重写描述符
    	const descriptor = Reflect.getOwnPropertyDescriptor(targetClass.prototype, methodName);
      Reflect.defineProperty(targetClass.prototype, methodName, {
        ...descriptor,
        value: async (req: Request, res: Response, next: NextFunction) => {
          if (!reqPropertiesMetadata.length) {  // 没有参数装饰器，择直接调用 targetMethodFunc
            return descriptor?.value(req, res, next);
          }
          const funcArgs: any[] = [];		// 拿到函数的所有参数
          // 一个函数中有多个参数装饰器时，执行顺序是倒序执行的，即第一个参数是最后一个执行的
          // 因此要倒着遍历
          for (let i = reqPropertiesMetadata.length - 1; i >= 0;i --) {
            const { property, key } = reqPropertiesMetadata[i];
            switch(property) {
              case 'body':
                funcArgs.push(key ? req.body[key] : req.body); break;
              case 'params':
                funcArgs.push(key ? req.params[key] : req.params); break;
              case 'query':
                funcArgs.push(key ? req.query[key] : req.query); break;
              default: funcArgs.push(void 0);
            }
          }
          // 内部执行出结果
          const finalData = await descriptor?.value(...funcArgs);
          res.send(finalData);
          next();
        }
      });
      // 拿到对应的路由函数
      const targetMethodFunc: RequestHandler = targetClass.prototype[methodName];
      // 当执行对应r outerPath 时，会自动执行 targetMethodFunc 方法
      if (routerPath && methodType && typeof targetMethodFunc === 'Function') {
        routerPath = `/${reqRootPath}/${routerPath}`.replace(/\/\//g, '/');
        // 设置路由
        router[methodType](routerPath, targetMethodFunc);
      }
    }
  }
}
```
同样的，`@Header`、`@Request`、`@Response` 等装饰器也可以用相似的。不过上面代码还有一个严重的问题，就是在 `Controller` 内部把 `targetMethodFunc` 直接传给了 router，而且如果有参数装饰器时，还会重写描述符的 value 值，这会导致在原来的类中方法内部访问的 this 变量丢失。

如何在 `Controller` 装饰器中也能访问到类的实例 this 呢？答案是使用装饰器工厂！

在 `Controller` 内部会返回类装饰器，而在类装饰器中我们定义一个子类继承被装饰的类然后返回出去，并把装饰器的那些逻辑放在子类的构造函数中。当父类被实例话时其实是实例化的子类（TS 编译时将父类替换成类装饰器最终返回的那个类），这样就可以绑定正确的 this 了！
```ts
export function Controller (reqRootPath: string = '') {
  return function <T extends new (...args: any[]) => any>(targetClass: T) {
    // 为了绑定 this，在类被实例化时就会执行下面的装饰器逻辑
    return class extends targetClass {
      constructor(...args: any[]) {
        super(...args);
        const self = this;
        for (let methodName in targetClass.prototype) {
          // ....
          const descriptor = Reflect.getOwnPropertyDescriptor(targetClass.prototype, methodName);
          Reflect.defineProperty(targetClass.prototype, methodName, {
            ...descriptor,
            value: async (req: Request, res: Response, next: NextFunction) => {
              if (!reqPropertiesMetadata.length) {  // 没有参数装饰器，择直接调用 targetMethodFunc
                return descriptor?.value.call(self, req, res, next);
              }
              const funcArgs: any[] = [];
              // ....
              // 绑定 this
              const finalData = await descriptor?.value.apply(self, funcArgs);
              res.send(finalData);
              next();
            }
          });
          const targetMethodFunc: RequestHandler = targetClass.prototype[methodName];
          // 当执行对应routerpath时，会自动执行targetMethodfunc方法
          if (routerPath && methodType) {
            routerPath = `/${reqRootPath}/${routerPath}`.replace(/\/\//g, '/');
            router[methodType](routerPath, targetMethodFunc);
          }
        }
      }
    }
  }
}
```
以上就是 `Nest.js` 中一些装饰器的大致实现思路，当然 Nestjs 内部的实现要比这复杂的多、优雅的多，参数装饰器的功能也要丰富得多，本文主要是对装饰器的简单实践，更多装饰器的用法和实践可以参考官方仓库中的源码。  

## 小结
1. 装饰器分类：
  - 类装饰器；
  - 方法装饰器；
  - 属性装饰器；
  - 函数参数装饰器；
  - 元数据装饰器；
  - 构造器参数装饰器；


2. 装饰器的执行顺序：
  - 先执行属性装饰器；
  - 然后执行方法参数装饰器（一个方法中有多个参数装饰器时，采用倒序执行，即第一个参数装饰器是最后一个执行的，所有参数装饰器执行完后，才会执行它们所在的方法装饰器）；
  - 之后执行方法装饰器；
  - 执行构造器参数装饰器（和类装饰器相似，参数是类本身，没有 propertyKey 参数）；
  - 最后执行类装饰器；
  
3. 装饰器签名：
   
   ```ts
    /** 属性描述 */
    interface TypedPropertyDescriptor<T> {
        enumerable?: boolean;
        configurable?: boolean;
        writable?: boolean;
        value?: T;
        get?: () => T;
        set?: (value: T) => void;
    }
    /** 类装饰器 */
    declare type ClassDecorator = <TFunction extends Function>(target: TFunction) => TFunction | void;
    /** 属性装饰器 */
    declare type PropertyDecorator = (target: Object, propertyKey: string | symbol) => void;
    /** 方法装饰器 */
    declare type MethodDecorator = <T>(target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<T>) => TypedPropertyDescriptor<T> | void;
    /** 函数参数装饰器 */
    declare type ParameterDecorator = (target: Object, propertyKey: string | symbol, parameterIndex: number) => void;
    ```

尽管装饰器很好用，但目前还没有进入标准，重度使用装饰器需谨慎。比如目前 Mobx V6 版本也不建议使用装饰器，有些特性还不明朗、不稳定。在日常开发中建议只是去用已经实现的装饰器，尽量不要去自己写一些装饰器，因为一旦草案变化，可能会导致得重写一遍。

## 参考

1. [TC39 proposal-decorators](https://github.com/tc39/proposal-decorators)
2. [babel-plugin-proposal-decorators](https://babeljs.io/docs/en/babel-plugin-proposal-decorators)
3. [TypeScript enable decorator](https://www.typescriptlang.org/tsconfig#experimentalDecorators)
4. [reflect-metadata 文档](https://rbuckton.github.io/reflect-metadata/)
5. [Nest.js 官方文档](https://nestjs.com/)
6. [Mobx 中文文档](https://zh.mobx.js.org/README.html)
7. [MDN：Reflect API](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect)
8. [MDN：defineProperty API](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty)
9. [知乎：贺师俊：应该在production里使用typescript的decorator？](https://www.zhihu.com/question/404724504)
10. [掘金：走近MidwayJS：初识TS装饰器与IoC机制](https://juejin.cn/post/6859314697204662279)
11. [ECMAScript 双月报告：装饰器提案进入 Stage 3](https://mp.weixin.qq.com/s/6PTcjJQTED3WpJH8ToXInw)
12. [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
13. [mobx：\[breaking change\] Get rid of field initializers (and legacy decorators) #2288](https://github.com/mobxjs/mobx/issues/2288)

