import { _decorator, Component } from 'cc';
import { HpBarManager } from '../ui/HpBarManager';
const { ccclass, property } = _decorator;

@ccclass('Stone')
export class Stone extends Component {
    @property({ tooltip: '最大血量' })
    maxHp: number = 100;

    private _currentHp: number = 100;

    start() {
        this._currentHp = this.maxHp;
        // 主动注册血条
        if (HpBarManager.instance) {
            HpBarManager.instance.registerStone(this);
        } else {
            console.warn('Stone: HpBarManager 未初始化');
        }
    }

    public takeDamage(damage: number): boolean {
        this._currentHp -= damage;
        if (this._currentHp <= 0) {
            this._currentHp = this.maxHp;
            this.node.emit('stone-resource-gained');
            return true;
        }
        return false;
    }

    public getHpPercent(): number {
        return this._currentHp / this.maxHp;
    }
}