import { _decorator, Component } from 'cc';
import { HpBarManager } from '../ui/HpBarManager';
const { ccclass, property } = _decorator;

@ccclass('Stone')
export class Stone extends Component {
    @property({ tooltip: '最大血量' })
    maxHp: number = 100;

    @property({ tooltip: '血量归零时产出的资源类型（对应 ResourceConfig 中的 typeName）。若为空，则使用攻击者的默认产出。' })
    resourceType: string = 'stone';

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

    /**
     * 受到伤害，返回是否触发资源产出（血量归零并重置）
     */
    public takeDamage(damage: number): boolean {
        this._currentHp -= damage;
        if (this._currentHp <= 0) {
            this._currentHp = this.maxHp;
            this.node.emit('stone-resource-gained');
            return true;
        }
        return false;
    }

    /**
     * 获取当前血量百分比 (0~1)
     */
    public getHpPercent(): number {
        return this._currentHp / this.maxHp;
    }

    /**
     * 获取本石头配置的产出资源类型，若为空则返回默认值
     */
    public getResourceType(): string {
        return this.resourceType || 'stone';
    }
}