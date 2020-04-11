//观察者模式
//目标者类
class Subject{
    constructor(){
        this.observers = []//观察者列表
    }
    //添加观察者
    add(observer){
        this.observers.push(observer)
    }
    //删除观察者
    remove(observer){
        let idx = this.observers.findIndex(item=>item===observer);
        this.observers.splice(idx,1)
    }
    //通知
    notify(){
        //循环所有观察者，并执行更新函数
        for(let observer of this.observers){
            observer.update()
        }
    }
}


//观察者类
class Observer{
    constructor(name){
        this.name = name
    }

    update(){
        console.log(`发布者通知我更新了,我是${this.name}`)
    }
}

//实例化目标者
const subject = new Subject();
//实例化2个观察者
const observer1 = new Observer('我是观察者1')
const observer2 = new Observer('我是观察者2')

subject.add(observer1);
subject.add(observer2);

//通知更新
subject.notify()