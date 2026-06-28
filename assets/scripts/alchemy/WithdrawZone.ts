// assets/scripts/alchemy/WithdrawZone.ts
import { _decorator, Vec3, tween, Node as CcNode } from 'cc';
import { BaseZone } from './BaseZone';
import { LayoutBase } from '../resource/LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('WithdrawZone')
export class WithdrawZone extends BaseZone {
    @property({ tooltip: '要取出的资源类型' })
    resourceType: string = 'gold';

    @property({ tooltip: '每次取出间隔（秒）' })
    interval: number = 0.1;

    @property({ tooltip: '飞行动画时长' })
    flyDuration: number = 0.2;

    @property({ tooltip: '飞行弧线高度' })
    flyArcHeight: number = 1.5;

    @property({ type: LayoutBase, tooltip: '布局组件' })
    layout: LayoutBase | null = null;

    private _timer: number = 0;

    protected onEnter() {
        this._timer = 0;
    }

    protected onLeave() { }

    update(dt: number) {
        if (!this._isPlayerInside) return;

        if (!this._playerBackpack) return;

        this._timer += dt;
        if (this._timer >= this.interval) {
            this._timer = 0;
            this.tryWithdraw();
        }
    }

    private tryWithdraw() {
        if (!this._playerBackpack || !this.layout) return;

        const currentCount = this._playerBackpack.getCount(this.resourceType);
        if (currentCount >= 300) return;

        // 获取最顶层方块的世界位置作为飞行起点
        const startPos = this.layout.getTopBlockWorldPos();
        if (!startPos) return;

        // 再从布局中移除该顶层方块（确保位置一致）
        const blockNode = this.layout.removeBlock();
        if (!blockNode) return;

        this.flyToPlayer(blockNode, startPos, () => {
            if (this._playerBackpack) {
                this._playerBackpack.addItem(this.resourceType);
            }
            blockNode.destroy();
        });
    }

    private flyToPlayer(node: CcNode, startPos: Vec3, onComplete: () => void) {
        if (!this._playerBackpackView) {
            onComplete();
            return;
        }

        const playerPos = this._playerBackpackView.node.getWorldPosition();
        // 飞行目标暂定为玩家头顶附近，实际添加物品后背包视图会正确显示方块
        const targetPos = new Vec3(playerPos.x, playerPos.y + 1.0, playerPos.z);

        const midPoint = new Vec3();
        Vec3.add(midPoint, startPos, targetPos).multiplyScalar(0.5);
        midPoint.y += this.flyArcHeight;

        const obj = { t: 0 };
        tween(obj)
            .to(this.flyDuration, { t: 1 }, {
                onUpdate: () => {
                    const t = obj.t;
                    const u = 1 - t;
                    const pos = new Vec3();
                    pos.x = u * u * startPos.x + 2 * u * t * midPoint.x + t * t * targetPos.x;
                    pos.y = u * u * startPos.y + 2 * u * t * midPoint.y + t * t * targetPos.y;
                    pos.z = u * u * startPos.z + 2 * u * t * midPoint.z + t * t * targetPos.z;
                    node.setWorldPosition(pos);
                },
                onComplete: () => {
                    onComplete();
                }
            })
            .start();
    }
}