---
author: Mh
pubDatetime: 2020-07-25T08:40:35Z
title: react-redux 中的 Hook 使用、context、JSX、性能优化以及与 Vue 的对比
postSlug: use-react-redux-hook
featured: false
draft: false
tags:
    - React
    - Vue
ogImage: ""
description: "react-redux 中的 Hook 使用、context、JSX、性能优化以及与 Vue 的对比"
---

## redux
下图是 Redux 的工作流程图。  
![redux工作流程图](/blogs/react/react-redux-hook.png)
图中更新数据需要派发 `Action`，action 进入 dispatch，`dispatch` 中可能还会触发 action，比如使用 `redux-thunk` 中间件进行异步请求时，还会派发 action。然后 dispatch 函数会把 action 传递给 reducer 函数，reducer 用于状态的变更，状态变更后引起视图（View）更新。  

### react-redux

react-redux 是 React 应用和 redux 的桥接器。下面是他的使用方式。  

```js
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

import { Provider, connect } from 'react-redux';
import store from './store/store';

ReactDOM.render(
  // 把 store 传递给容器组件
  <Provider store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);

class App extends React.Component{
  // ...
}

function mapStateToProps(state){
  return {    // 返回要使用的状态和方法
    count: state.count,
    handleClick(){
      // ...
    }
  }
}

function mapDispatchToProps(dispatch){
  return {
    dispatch
  }
}

export default connect(mapStateToPorps, mapDispatchToProps)(App);
```

在 React Hook 出现之后，react-redux 中也定义了几个 Hook。下面就简单介绍一下如何使用。  

使用 Hook 就不能使用 `connect` 了，`connect` 是一个高阶组件，包装函数组件会报错。react-redux 提供了两个 Hook：`useDispatch` 和 `useSelector`。前者用于获得 dispatch 函数，后者用于获得你要使用的状态。例如：  

```js
import { useDispatch, useSelector } from 'react-redux';
function App(){
  let dispatch = useDispatch();
  // 从 state 中获取到 count 和 color 两个状态
  // 相较于 mapStateToPorps，useSelector 可以返回任意的值
  // mapStateToPorps 只能返回对象
  let { count, color } = useSelector(state => state);
  // 或者返回特定的 isShow 状态
  let isShow = useSelector(state => state.isShow);
}
```

`useSelector` 还可以传入第二个参数，它是一个比较函数，函数的参数是这一次的 state 和 这一次的 state。默认情况下，`useSelector` 使用 `===` 进行比较，即 `nextState === prevState`，当两者相等时认为不需要重新渲染。如果`selector`函数返回的是对象，那实际上每次useSelector执行时调用它都会产生一个新对象，这就会造成组件无意义的re-render。要解决这个问题，react-redux 还提供了浅比较，它会比较 state 对象里面的各项数据。  

```js
import { shallowEqual, useSelector } from 'react-redux';

// 使用浅比较的方式进行重渲染（在组件内）
const userData = useSelector(state => state.userData, shallowEqual);
```

react-redux 还提供了 `useStore` 可以很方便的获取到 store 对象。

`Provider` 组件还是一样要传入 `store`。除此之外，`Provider` 组件还可以传入一个 `context` 属性，值是用 `React.createContext` 创建的 context，这样是为了避免 context 数据和 redux store 中的数据冲突。使用如下：  

```js
import { 
  Provider, 
  createDispatchHook, 
  createStoreHook, 
  createSelectorHook 
} from 'react-redux';

const MyCtx = React.createContext(null);
// 在其他文件中使用自定义的 Hook，可以引用这里的
export const useStore = createStoreHook(MyCtx);
export const useDispatch = createDispatchHook(MyCtx);
export const useSelector = createSelectorHook(MyCtx);

ReactDOM.render(
  <Provider context={ MyCtx } store={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);
```

使用时父组件需要使用 `MyCtx.Provider` 包裹子组件，子组件可以使用 `useContext` 获取到数据。  

其它一些用法可以参考：[[译]React-Redux官方Hooks文档说明](http://react-china.org/t/topic/34076)

## context
`Context` 设计目的是为了共享那些对于一个组件树而言是“全局”的数据，例如当前认证的用户、主题或首选语言。对于层级很深的组件来说，如果我们从顶层组件开始传递 props，这很容易出错。`context` 可以将状态跨层级传递。 

可以使用生产和消费的方式使用 context，比如我们想要给 Item 组件传入一个 color 数据，Item 组件是 List 组件的子组件，就可以使用 context 实现跨组件传递数据。  

```js
// 生成一个 context，并设置默认值
// 只有当组件所处的树中没有匹配到 Provider 时，其默认参数才会生效
let CompCtx = React.createContext('red');

class App extends Component{
  constructor(){
    super();
    this.state = {
      list: [],
      color: 'green'
    };
  }
  // 。。。。
  render(){
    return (
      <div>
        {/* Provider 是生产者 */}
        <CompCtx.Provider value={ this.state.color }>
          <List list={this.state.list} />
        </CompCtx.Provider>
      </div>
    );
  }
}

class List extends Component{
  // ....
}

class Item extends Component{
  // 使用 this.context 来消费最近 Context 上的那个值
  static contextType = CompCtx;
  render(){
    return (
      {/* 在 this.context 中可以拿到上层组件传入的数据 */}
      <li style={{ color: this.context }}>{ this.props.msg }</li>
    );
  }
}
```

`this.context` 是上层组件传来的数据，它可以在任何生命周期中访问到，包括 `render` 函数中。当 Provider 的 value 值发生变化时，它内部的所有消费组件都会重新渲染。Provider 及其内部 consumer 组件都不受制于 shouldComponentUpdate 函数。一个 Provider 可以和多个消费组件有对应关系。多个 Provider 也可以嵌套使用，里层的会覆盖外层的数据。  

如果 Item 组件是一个函数组件，需要这么书写：  

```js
function Item(props){
  return (
    <CompCtx.Consumer>
      { value => <li style={{ color: value }}>{ props.msg }</li> }
    </CompCtx.Consumer>
  );
}
```

子组件中除了使用 `Comsumer` 的方式之外，也可以使用 `useContext` 这个 Hook。  

```js
function Item(props){
  let value = useContext(CompCtx);
  return (
    <li style={{ color: value }}>{ props.msg }</li>
  );
}
```

## JSX
在 React 中，除了使用 JSX 语法之外，还可以使用 `React.createElement` API。例如下面一段 JSX：

```jsx
<div className="wrapper">
  <input type="text" />
  <button>Click</button>
  <Child />
</div>
```

编译成原始的 JavaScript 代码将变成：  

```js
React.createElement(
  "div", 
  {className: "wrapper"},
  React.createElement(
    "input", 
    {type: "text"}
  ),
  React.createElement("button", null, "Click"),
  React.createElement(Child, null)
)
```

`createElement` 的函数参数：  

```js
React.createElement(
  type,   // 类型，可能是元素、字符串或者 React 组件
  [props],  // porps 或者 state
  [...children]   // 孩子节点
)
```

实时编译效果可以使用 Babel 的在线编译器：[Babel complier](https://babeljs.io/repl)

## 性能优化
- 渲染列表时加上 `key`；
- 自定义事件、DOM 事件、定时器及时销毁；
- 合理使用异步组件（Suspense + Lazy）；
- 合理使用 `PureComponent` 和 `memo`；
- 使用 `useCallback` 和 `useMemo` 包裹函数和计算值；  

## 对比 Vue
相同点：  

- 都支持组件；
- 都是数据驱动视图；
- 都使用 vdom 操作 DOM。  

不同点：  

- React 使用 JSX，通过 JavaScript 操作一切；Vue 使用模板，拥抱 HTML；
- React 是函数式编程，数据不可变，把组件设计成纯函数，更新状态使用 `setState`，单向数据流；Vue 是声明式编程，数据可变，响应式，支持双向绑定。  
- React 的优化需要手动去做，而 Vue 的性能优化是自动的。  
- Vue 对于初学者比较友好，内置了一些功能（API 比较多）；React 主要负责 UI 渲染（API 很少），其它功能由社区提供，React 要求 JavaScript 编程能力较高（比如要会使用 ES6）。
