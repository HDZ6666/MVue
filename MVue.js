class MVue {
    constructor(option) {
        this.$el = option.el;//入口
        this.$data = option.data;//数据
        this.$methods = option.methods;//方法
        this.$option = option;

        this.$data && new Observer(this.$data, this)//创建数据劫持类

        this.$el && new Compile(this.$el, this)//创建模板编译类

        //实现proxy代理
        this.proxyData(this.$data)
    }
    proxyData(data) {
        for (const key in data) {
            Object.defineProperty(this, key, {
                get: function proxyGetter() {
                    return data[key]
                },
                set: function proxySetter(newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}

//编译模板类
class Compile {
    constructor(el, vm) {
        this.vm = vm;
        this.el = this.isElementNode(el) ? el : document.querySelector(el);//判断是否是元素节点

        if (this.el) {
            const f = this.createFragment(this.el) //返回文档碎片
            this.compile(f)
            this.el.appendChild(f)
        }
    }

    // 判断是否元素节点
    isElementNode(node) {
        return node && node.nodeType === 1;
    }

    //判断是否指令
    isDirective(name) {
        return name.includes('v-')
    }

    //创建文档碎片
    createFragment(node) {
        let f = document.createDocumentFragment();
        let first;
        while (first = node.firstChild) {
            f.appendChild(first)
        }
        return f;
    }
    //编译文档碎片
    compile(fragment) {
        let childNodes = fragment.childNodes;
        [...childNodes].forEach(node => {
            if (this.isElementNode(node)) {
                //是元素节点
                // console.log(node)          
                this.compile(node);//递归遍历子节点
                this.compileElement(node);//先编译元素节点         
            } else {
                //是字符节点
                this.compileText(node)//编译文本节点
            }
        });
    }
    //编译元素节点
    compileElement(node) {
        const attributes = node.attributes;
        //如果有属性
        if (attributes.length) {
            [...attributes].forEach(attribute => {
                const { name, value } = attribute
                //判断是否vue指令
                if (this.isDirective(name)) {
                    const [, type] = name.split('-');//分割
                    const [directiveType, eventName] = type.split(':');//防止on
                    compileUtil[directiveType](node, value, this.vm, eventName)
                }
            })
        }

    }
    //编译文本节点
    compileText(node) {
        const nodeText = node.textContent;
        const reg = /\{\{([^}]+)\}\}/g //正则匹配包含{{}}的文本字符
        if (reg.test(nodeText)) {
            compileUtil['template'](node, nodeText, this.vm)
        }
    }
}


// 解析不同指令或者文本编译集合
const compileUtil = {
    /**
     * 在前面 已经创建好数据的劫持 所以根据指令取值的过程--getValue()方法 就会触发数据劫持类的get方法
     */
    getValue(expr, vm) {
        //当遇到多重对象 如 person.age.fav =>[person,age,fav]
        return expr.split('.').reduce((data, currentValue) => {
            return data[currentValue]
        }, vm.$data)
    },
    // 获取文本编译后的对应的数据
    getTextValue(expr, vm) {
        // {{personalbar.name}}--{{personalbar.age}}
        // console.log(expr.match(/\{\{([^}]+)\}\}/g))//匹配满足的所有子字符串
        return expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => {
            return this.getValue(arguments[1], vm)
        })
    },
    setVal(expr, vm, input) {
        let arr = expr.split('.');
        arr.reduce((data, currentValue, index) => {
            if (index === arr.length - 1) {
                //最后一个
                data[currentValue] = input
            }
            return data[currentValue]
        }, vm.$data)
    },


    template(node, expr, vm) {
        //{{}}
        //第二步先建立watcher
        const value = expr.replace(/\{\{([^}]+)\}\}/g, (...arguments) => {
            new Watcher(vm, arguments[1], (newValue) => {
                this.updater.textUpdater(node, this.getTextValue(expr, vm))
            })
            return this.getValue(arguments[1], vm)
        })
        // const value = this.getTextValue(expr, vm);
        this.updater.textUpdater(node, value)
    },
    text(node, expr, vm) {
        //v-text 
        //第一步获取的初始值
        const value = this.getValue(expr, vm);
        //第二步先建立watcher
        new Watcher(vm, expr, (newValue) => {
            this.updater.textUpdater(node, newValue)
        })
        this.updater.textUpdater(node, value)
    },
    html(node, expr, vm) {
        //v-html
        const value = this.getValue(expr, vm);
        //第二步先建立watcher
        new Watcher(vm, expr, (newValue) => {
            this.updater.htmlUpdater(node, newValue)
        })
        this.updater.htmlUpdater(node, value)
    },
    model(node, expr, vm) {
        //v-model
        const value = this.getValue(expr, vm);
        //第二步先建立watcher
        new Watcher(vm, expr, (newValue) => {
            this.updater.modelUpdater(node, newValue)
        })
        node.addEventListener('input', (e) => {
            //input事件中触发 数据劫持类中的set
            this.setVal(expr, vm, e.target.value);
        })
        this.updater.modelUpdater(node, value)
    },
    on(node, expr, vm, event) {
        //v-on 增加事件监听
        // console.log(vm.$methods[expr].call(vm))
        node.addEventListener(event, () => {
            return vm.$methods[expr].apply(vm)
        })
    },
    //更新的函数
    updater: {
        textUpdater(node, value) {
            node.textContent = value;
        },
        htmlUpdater(node, value) {
            node.innerHTML = value;
        },
        modelUpdater(node, value) {
            node.value = value
        }
    }
}

//数据劫持类
class Observer {
    constructor(data, vm) {
        this.observe(data, vm)
    }
    //
    observe(data, vm) {
        if (!data || typeof data !== 'object') {
            return
        }
        //遍历对象的keys     
        Object.keys(data).forEach((key) => {
            // 劫持对象中单个属性
            this.defineReactive(data, key, data[key])
            this.observe(data[key], vm) // 深度递归，保证子属性的值也会被劫持
        })
    }
    defineReactive(obj, key, value) {
        let dep = new Dep(key)
        let _this = this;
        Object.defineProperty(obj, key, {
            enumerable: true,//是否可枚举
            configurable: true,//是否可删
            get: function reactiveGetter() {
                //初始化会进入get     
                // 在取值时将订阅者push入订阅者数组
                Dep.target && dep.addSub(Dep.target);
                return value;
            },
            set: function reactiveSetter(newVal) {
                if (newVal !== value) {
                    _this.observe(newVal) // 如果新值是对象继续劫持
                    value = newVal//把新值赋给旧值
                    dep.notify() //通知所有订阅的人数据更新了
                    // console.log(dep.getName())
                }
            }
        })
    }
}

//订阅者收集器
class Dep {
    constructor(name) {
        //初始化订阅数组
        this.subs = [];
        this.name = name;
    }
    getSub() {
        return this.subs;
    }
    getName() {
        return this.name;
    }
    addSub(watcher) {
        //订阅者添加到订阅者列表
        this.subs.push(watcher)
    }
    notify() {
        // 通知订阅者，并执行订阅者的update回调
        this.subs.forEach(watcher => watcher.update())
    }
}

//订阅者类
class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        // console.log(this.getVal)
        // 先获取一下老值
        this.value = this.get()
    }
    get() {
        // 获取文本编译后的对应的数据
        // 获取当前订阅者      
        Dep.target = this
        //这一个步骤是触发数据劫持类的get方法 然后触发dep.addSub()方法
        let value = compileUtil.getValue(this.expr, this.vm)
        // 重置订阅者
        Dep.target = null
        return value
    }
    // 对外暴露的方法
    update() {
        let newValue = compileUtil.getValue(this.expr, this.vm)
        let oldValue = this.value
        // 更新的值 与 以前的值 进行比对， 如果发生变化就更新方法
        if (newValue !== oldValue) {
            this.cb(newValue)
        }
    }
}