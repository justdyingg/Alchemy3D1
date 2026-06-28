// assets/scripts/alchemy/MultiDepositZone.ts
import { _decorator, Vec3, tween, instantiate, Node, CCString } from 'cc';
import { BaseZone } from './BaseZone';
import { LayoutBase } from '../resource/LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('MultiDepositZone')
export class MultiDepositZone extends BaseZone {
    @property({ type: [CCString], tooltip: '接受卸货的资源类型列表' })
    acceptedTypes: string[] = [];

    @property({ type: [Node], tooltip: '与 acceptedTypes 一一对应的布局节点' })
    layoutNodes: Node[] = [];

    @property({ tooltip: '每次卸货间隔（秒）' })
    interval: number = 0.2;

    @property({ tooltip: '每次卸货数量' })
    amountPerTick: number = 1;

    @property({ tooltip: '飞行动画时长（秒）' })
    flyDuration: number = 0.2;

    @property({ tooltip: '飞行弧线高度' })
    flyArcHeight: number = 1.5;

    @property({ tooltip: '勾选后使用固定飞行终点；否则动态计算堆叠顶部' })
    useFixedTarget: boolean = false;

    @property({ tooltip: '固定终点偏移 X（仅固定模式）' })
    targetOffsetX: number = 0;

    @property({ tooltip: '固定终点偏移 Y（仅固定模式）' })
    targetOffsetY: number = 1.5;

    @property({ tooltip: '固定终点偏移 Z（仅固定模式）' })
    targetOffsetZ: number = 0;

    private _timer: number = 0;

    protected onEnter() { this._timer = 0; }
    protected onLeave() { }

    update(dt: number) {
        if (!this._isPlayerInside || !this._playerBackpack) return;
        this._timer += dt;
        if (this._timer >= this.interval) {
            this._timer = 0;
            this.tryUnloadAll();
        }
    }

    public isPlayerInside(): boolean { return this._isPlayerInside; }

    public getLayoutForType(type: string): LayoutBase | null {
        const index = this.acceptedTypes.indexOf(type);
        if (index === -1 || index >= this.layoutNodes.length) return null;
        const node = this.layoutNodes[index];
        return node ? node.getComponent(LayoutBase) : null;
    }

    private getFlyTargetOffset(): Vec3 {
        return new Vec3(this.targetOffsetX, this.targetOffsetY, this.targetOffsetZ);
    }

    private tryUnloadAll(): void {
        if (!this._playerBackpack || !this._playerBackpackView) return;

        for (let i = 0; i < this.acceptedTypes.length; i++) {
            const type = this.acceptedTypes[i];
            const layoutNode = this.layoutNodes[i];
            if (!layoutNode) continue;
            const layout = layoutNode.getComponent(LayoutBase);
            if (!layout) continue;

            const count = this._playerBackpack.getCount(type);
            if (count <= 0) continue;

            const flyStart = this._playerBackpackView.getBottomBlockWorldPos(type);
            if (!flyStart) continue;

            const removed = this._playerBackpack.removeItem(type, this.amountPerTick);
            if (removed <= 0) continue;

            if (!layout.blockPrefab) continue;
            const tempBlock = instantiate(layout.blockPrefab);
            tempBlock.setParent(this.node);
            tempBlock.setWorldPosition(flyStart);

            const targetPos = this.useFixedTarget
                ? this.node.getWorldPosition().clone().add(this.getFlyTargetOffset())
                : layout.getNextPosition();

            this.animateFly(tempBlock, flyStart, targetPos, () => {
                tempBlock.destroy();
                // 改为 addUnits，根据 unitsPerBlock 自动压缩
                layout.addUnits(removed);
            });
        }
    }

    private animateFly(node: Node, start: Vec3, end: Vec3, onComplete: () => void): void {
        const midPoint = new Vec3();
        Vec3.add(midPoint, start, end).multiplyScalar(0.5);
        midPoint.y += this.flyArcHeight;

        const obj = { t: 0 };
        tween(obj)
            .to(this.flyDuration, { t: 1 }, {
                onUpdate: () => {
                    const t = obj.t;
                    const u = 1 - t;
                    const pos = new Vec3();
                    pos.x = u * u * start.x + 2 * u * t * midPoint.x + t * t * end.x;
                    pos.y = u * u * start.y + 2 * u * t * midPoint.y + t * t * end.y;
                    pos.z = u * u * start.z + 2 * u * t * midPoint.z + t * t * end.z;
                    node.setWorldPosition(pos);
                },
                onComplete: () => { onComplete(); }
            })
            .start();
    }
}