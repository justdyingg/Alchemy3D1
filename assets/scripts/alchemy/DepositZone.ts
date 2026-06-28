// assets/scripts/alchemy/DepositZone.ts
import { _decorator, Vec3, tween, instantiate } from 'cc';
import { BaseZone } from './BaseZone';
import { LayoutBase } from '../resource/LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('DepositZone')
export class DepositZone extends BaseZone {
    @property({ tooltip: '要卸下的资源类型' })
    resourceType: string = 'stone';

    @property({ tooltip: '每次卸货间隔（秒）' })
    interval: number = 0.2;

    @property({ tooltip: '飞行动画时长' })
    flyDuration: number = 0.2;

    @property({ tooltip: '飞行弧线高度' })
    flyArcHeight: number = 1.5;

    @property({ type: LayoutBase, tooltip: '布局组件' })
    layout: LayoutBase | null = null;

    @property({ tooltip: '勾选后使用固定飞行终点（相对于区域节点的偏移）；不勾选则动态计算堆叠位置作为终点' })
    useFixedTarget: boolean = true;

    @property({ tooltip: '固定飞行终点的偏移量（仅 useFixedTarget 为 true 时生效）' })
    flyTargetOffset: Vec3 = new Vec3(0, 1.5, 0);

    private _timer: number = 0;

    protected onEnter() {
        this._timer = 0;
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

        const removed = this._playerBackpack.removeItem(this.resourceType, 1);
        if (removed <= 0) return;

        // 创建临时飞行方块
        const tempBlock = instantiate(this.layout.blockPrefab!);
        tempBlock.setParent(this.node); // 临时挂在区域节点下
        tempBlock.setWorldPosition(flyStart);

        // 根据开关决定飞行终点
        let targetPos: Vec3;
        if (this.useFixedTarget) {
            // 固定终点：区域节点位置 + 偏移
            targetPos = this.node.getWorldPosition().clone().add(this.flyTargetOffset);
        } else {
            // 动态终点：从布局获取下一个放置位置
            targetPos = this.layout.getNextPosition();
        }

        // 贝塞尔飞行
        const midPoint = new Vec3();
        Vec3.add(midPoint, flyStart, targetPos).multiplyScalar(0.5);
        midPoint.y += this.flyArcHeight;

        const obj = { t: 0 };
        tween(obj)
            .to(this.flyDuration, { t: 1 }, {
                onUpdate: () => {
                    const t = obj.t;
                    const u = 1 - t;
                    const pos = new Vec3();
                    pos.x = u * u * flyStart.x + 2 * u * t * midPoint.x + t * t * targetPos.x;
                    pos.y = u * u * flyStart.y + 2 * u * t * midPoint.y + t * t * targetPos.y;
                    pos.z = u * u * flyStart.z + 2 * u * t * midPoint.z + t * t * targetPos.z;
                    tempBlock.setWorldPosition(pos);
                },
                onComplete: () => {
                    tempBlock.destroy();
                    // 动态终点时，需要调用 spawnBlock 将方块正式加入布局
                    // 固定终点时，spawnBlock 也会增加一个方块（视觉表现）
                    this.layout!.spawnBlock();
                }
            })
            .start();
    }
}