// assets/scripts/alchemy/Crafter.ts
import { _decorator, Component, Node, Vec3, tween, instantiate } from 'cc';
import { LayoutBase } from '../resource/LayoutBase';
const { ccclass, property } = _decorator;

enum State {
    Idle,
    Absorbing,
    Crafting
}

@ccclass('Crafter')
export class Crafter extends Component {
    @property({ type: LayoutBase, tooltip: 'A 区域（原材料）的布局组件' })
    inputLayout: LayoutBase | null = null;

    @property({ type: LayoutBase, tooltip: 'B 区域（金矿产出）的布局组件' })
    outputLayout: LayoutBase | null = null;

    @property({ type: Node, tooltip: '空闲状态显示的模型节点' })
    idleModel: Node | null = null;

    @property({ type: Node, tooltip: '工作状态显示的模型节点' })
    workingModel: Node | null = null;

    @property({ tooltip: '吸取动画时长（秒）' })
    absorbDuration: number = 0.2;

    @property({ tooltip: '炼金时长（秒）' })
    craftDuration: number = 0.3;

    @property({ tooltip: '吸取飞行弧线高度' })
    flyArcHeight: number = 1.5;

    @property({ tooltip: '产出飞行时长（秒）' })
    productFlyDuration: number = 0.3;    // 稍微加长，容易观察

    @property({ tooltip: '产出飞行弧线高度' })
    productFlyArcHeight: number = 2.0;   // 弧线更高，轨迹明显

    @property({ tooltip: '产出飞行终点偏移（相对于B区域布局根节点）' })
    productEndOffset: Vec3 = new Vec3(0, 1.5, 0); // 飞向 B 区域上方 1.5 处

    private _state: State = State.Idle;
    private _currentTimer: number = 0;
    private _flyingBlock: Node | null = null;

    start() {
        this.showModel(false);
    }

    update(dt: number) {
        switch (this._state) {
            case State.Idle:
                this.tryStartAbsorb();
                break;
            case State.Crafting:
                this._currentTimer += dt;
                if (this._currentTimer >= this.craftDuration) {
                    this._currentTimer = 0;
                    this.onCraftFinished();
                }
                break;
        }
    }

    private tryStartAbsorb(): void {
        if (!this.inputLayout || !this.outputLayout) return;

        const startPos = this.inputLayout.getBottomBlockWorldPos();
        if (!startPos) return;

        const blockNode = this.inputLayout.removeBlock();
        if (!blockNode) return;

        this._state = State.Absorbing;
        this.showModel(true);

        const targetPos = this.getTargetPosition();
        this._flyingBlock = blockNode;
        this.animateFly(blockNode, startPos, targetPos, this.absorbDuration, this.flyArcHeight, () => {
            if (this._flyingBlock) {
                this._flyingBlock.destroy();
                this._flyingBlock = null;
            }
            this._state = State.Crafting;
            this._currentTimer = 0;
        });
    }

    private onCraftFinished(): void {
        if (!this.outputLayout) return;

        // 计算飞行起点：炼金台工作模型位置（或节点位置）
        const startPos = this.getProductStartPos();
        // 飞行终点：B 区域布局根节点位置 + 偏移（让方块从空中落下）
        const layoutRootPos = this.outputLayout.layoutRoot?.getWorldPosition() || Vec3.ZERO;
        const targetPos = layoutRootPos.clone().add(this.productEndOffset);


        // 创建临时金矿方块用于飞行
        const tempBlock = instantiate(this.outputLayout.blockPrefab!);
        tempBlock.setWorldPosition(startPos);
        // 临时挂到场景根下，避免被 B 区域布局影响
        tempBlock.setParent(this.node.parent);

        this.animateFly(tempBlock, startPos, targetPos, this.productFlyDuration, this.productFlyArcHeight, () => {
            tempBlock.destroy();
            // 在布局中正式添加方块
            this.outputLayout!.spawnBlock();

            if (this.inputLayout && this.inputLayout.hasBlocks()) {
                this.tryStartAbsorb();
            } else {
                this._state = State.Idle;
                this.showModel(false);
            }
        });
    }

    private getTargetPosition(): Vec3 {
        if (this.workingModel) {
            const pos = this.workingModel.getWorldPosition().clone();
            pos.y += 0.5;
            return pos;
        }
        return this.node.getWorldPosition().clone();
    }

    private getProductStartPos(): Vec3 {
        if (this.workingModel) {
            return this.workingModel.getWorldPosition().clone();
        }
        return this.node.getWorldPosition().clone();
    }

    private animateFly(node: Node, start: Vec3, end: Vec3, duration: number, arcHeight: number, onComplete: () => void): void {
        const midPoint = new Vec3();
        Vec3.add(midPoint, start, end).multiplyScalar(0.5);
        midPoint.y += arcHeight;

        const obj = { t: 0 };
        tween(obj)
            .to(duration, { t: 1 }, {
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

    private showModel(working: boolean): void {
        if (this.idleModel) this.idleModel.active = !working;
        if (this.workingModel) this.workingModel.active = working;
    }
}