// assets/scripts/alchemy/CoinConsumerZone.ts
import { _decorator, Component, Node } from 'cc';
import { BaseZone } from './BaseZone';

const { ccclass, property } = _decorator;

/**
 * 消耗金币后执行的效果接口
 */
export interface ICoinConsumerEffect {
    /** 消耗成功时调用 */
    onCoinConsumed(): void;
}

@ccclass('CoinConsumerZone')
export class CoinConsumerZone extends BaseZone {
    @property({ tooltip: '消耗所需金币数量' })
    requiredCoinAmount: number = 10;

    @property({ tooltip: '是否只消耗一次（勾选后触发一次就消失/失效）' })
    consumeOnce: boolean = false;

    @property({ type: Node, tooltip: '挂载了 ICoinConsumerEffect 的效果节点（通常就是自身）' })
    effectNode: Node | null = null;

    private _consumed: boolean = false;

    protected onEnter(): void {
        // 如果已经一次性消耗过且设置只消耗一次，则不再处理
        if (this.consumeOnce && this._consumed) return;
        this.tryConsume();
    }

    protected onLeave(): void {
        // 离开区域不做处理
    }

    update(dt: number): void {
        // 不需要每帧检测，只在进入时尝试即可，但如果需要持续消耗可在此实现
    }

    private tryConsume(): void {
        if (!this._playerBackpack) return;

        const coinCount = this._playerBackpack.getCount('coin');
        if (coinCount >= this.requiredCoinAmount) {
            // 扣除金币
            this._playerBackpack.removeItem('coin', this.requiredCoinAmount);

            // 调用效果
            if (this.effectNode) {
                const components = this.effectNode.getComponents(Component);
                let called = false;
                for (const comp of components) {
                    if (typeof (comp as any).onCoinConsumed === 'function') {
                        (comp as any).onCoinConsumed();
                        called = true;
                        break;
                    }
                }
                if (!called) {
                    console.warn('CoinConsumerZone: 效果节点未找到实现了 onCoinConsumed() 的组件');
                }
            }

            this._consumed = true;

            // 如果设置只消耗一次，可以禁用自己（避免再次进入触发）
            if (this.consumeOnce) {
                // 可以关闭碰撞体或整个组件
                const collider = this.getComponent('Collider');
                if (collider) collider.enabled = false;
            }
        }
    }
}