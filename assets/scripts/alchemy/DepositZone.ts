import { _decorator, Vec3, tween } from 'cc';
import { BaseZone } from './BaseZone';
import { LayoutBase } from '../resource/LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('DepositZone')
export class DepositZone extends BaseZone {
    @property({ tooltip: '要卸下的资源类型' })
    resourceType: string = 'stone';

    @property({ tooltip: '每次卸货间隔（秒）' })
    interval: number = 0.2;

    @property({ tooltip: '每次卸货数量' })
    amountPerTick: number = 1;

    @property({ tooltip: '飞行动画时长' })
    flyDuration: number = 0.2;

    @property({ tooltip: '飞行弧线高度' })
    flyArcHeight: number = 1.5;

    @property({ type: LayoutBase, tooltip: '定义了布局组件把对应的自己实体拖进来' })
    layout: LayoutBase | null = null;

    private _timer: number = 0;

    protected onEnter() {
        this._timer = 0; // 立即开始卸货
    }

    protected onLeave() {
        // nothing
    }

    update(dt: number) {
        if (!this._isPlayerInside || !this._playerBackpack) return;

        this._timer += dt;
        if (this._timer >= this.interval) {
            this._timer = 0;
            this.tryUnload();
        }
    }

    private tryUnload() {
        if (!this._playerBackpack || !this._playerBackpackView || !this.layout) return;

        const count = this._playerBackpack.getCount(this.resourceType);
        if (count <= 0) return;

        const flyStart = this._playerBackpackView.getBottomBlockWorldPos(this.resourceType);
        if (!flyStart) return;

        const removed = this._playerBackpack.removeItem(this.resourceType, this.amountPerTick);
        if (removed <= 0) return;

        // 飞行动画 + 放置
        for (let i = 0; i < removed; i++) {
            const block = this.layout.spawnBlock();
            if (!block) continue;

            const startPos = flyStart.clone();
            const endPos = block.getWorldPosition().clone();
            block.setWorldPosition(startPos);

            const midPoint = new Vec3();
            Vec3.add(midPoint, startPos, endPos).multiplyScalar(0.5);
            midPoint.y += this.flyArcHeight;

            const obj = { t: 0 };
            tween(obj)
                .to(this.flyDuration, { t: 1 }, {
                    onUpdate: () => {
                        const t = obj.t;
                        const u = 1 - t;
                        const pos = new Vec3();
                        pos.x = u * u * startPos.x + 2 * u * t * midPoint.x + t * t * endPos.x;
                        pos.y = u * u * startPos.y + 2 * u * t * midPoint.y + t * t * endPos.y;
                        pos.z = u * u * startPos.z + 2 * u * t * midPoint.z + t * t * endPos.z;
                        block.setWorldPosition(pos);
                    },
                    onComplete: () => {
                        block.setWorldPosition(endPos);
                    }
                })
                .start();
        }
    }
}