// assets/scripts/alchemy/AutoOutputZone.ts
import { _decorator, Component, Vec3, tween, instantiate, Node } from 'cc';
import { LayoutBase } from '../resource/LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('AutoOutputZone')
export class AutoOutputZone extends Component {
    @property({ type: LayoutBase, tooltip: '金币产出的布局组件' })
    outputLayout: LayoutBase | null = null;

    @property({ tooltip: '飞行时长（秒）' })
    flyDuration: number = 0.3;

    @property({ tooltip: '飞行弧线高度' })
    flyArcHeight: number = 2.0;

    @property({ tooltip: '产出飞行终点偏移（相对于布局根节点）' })
    targetOffset: Vec3 = new Vec3(0, 1.5, 0);

    @property({ tooltip: '每次飞行代表的金币数量（1为不压缩）' })
    coinsPerFlyBlock: number = 1;

    /**
     * 从指定世界坐标产出 count 个金币到布局中（自动合并飞行）
     * @param startPos 飞行起点（世界坐标）
     * @param count 金币总数
     * @param onComplete 全部完成后的回调
     */
    public addItem(startPos: Vec3, count: number, onComplete?: () => void): void {
        if (!this.outputLayout || count <= 0 || this.coinsPerFlyBlock <= 0) {
            onComplete?.();
            return;
        }

        // 计算需要飞行的批次数和每批的金币数
        const batchSize = Math.min(count, this.coinsPerFlyBlock);
        let remaining = count;

        const targetPos = this.outputLayout.layoutRoot?.getWorldPosition().clone().add(this.targetOffset) ?? Vec3.ZERO;

        const flyNextBatch = () => {
            if (remaining <= 0) {
                onComplete?.();
                return;
            }

            const currentBatch = Math.min(remaining, batchSize);
            remaining -= currentBatch;

            const tempBlock = instantiate(this.outputLayout!.blockPrefab!);
            tempBlock.setParent(this.node);
            tempBlock.setWorldPosition(startPos);

            this.animateFly(tempBlock, startPos, targetPos, () => {
                tempBlock.destroy();
                // 落地后增加对应数量的金币单位
                this.outputLayout!.addUnits(currentBatch);
                // 继续下一批
                flyNextBatch();
            });
        };

        flyNextBatch();
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
                onComplete: () => {
                    onComplete();
                }
            })
            .start();
    }
}