//发布者-  订阅者模式
//主题中心
class Dep {
    constructor(name) {
        this.name = name //主题名称
        this.subs = []//主题收集器
    }
    //向主题收集器添加订阅者
    add(watcher) {
        this.subs.push(watcher)
        return this //返回this 方便链式调用
    }
    //删除主题订阅者
    remove(watcher) {
        let idx = this.subs.findIndex(item => item === watcher)
        this.subs.splice(idx, 1)
    }
    //通知主题内所有订阅者更新
    notify(...arg) {
        console.log(`我是主题：${this.name}`)
        this.subs.forEach(watcher => {
            watcher.update(...arg)
        })
    }
}

//订阅者
class Watcher {
    constructor(name) {
        this.name = name
    }
    update(...arg) {
        console.log(`我是订阅者：${this.name}，我更新了`)
    }
}

//发布者
class Pulisher {
    constructor() {
        this.pushlist = []
    }
    //添加主题
    add(dep) {
        this.pushlist.push(dep)
    }
    //删除主题
    remove(dep) {
        let idx = this.subs.findIndex(item => item === dep)
        this.subs.splice(idx, 1)
    }
    //通知该主题更新
    notify(dep) {
        this.pushlist.forEach(item => item == dep && item.notify());
    }
}
//实例化发布者
let pusher = new Pulisher()

let watcher1 = new Watcher('张三')//实例化订阅者张三
let watcher2 = new Watcher('李四')//实例化订阅者李四

let dep1 = new Dep('主题1') //实例化主题1
//望主题1添加订阅者张三和李四
dep1.add(watcher1).add(watcher2)

pusher.add(dep1) //发布者添加主题1


let watcher3 = new Watcher('王五')//实例化订阅者王五
let watcher4 = new Watcher('赵六')//实例化订阅者赵六

let dep2 = new Dep('主题2')
dep2.add(watcher3).add(watcher4)

pusher.add(dep2) //发布者添加主题2


pusher.notify(dep2)//通知主题2更新

