// assets/scripts/player/BackpackView.ts
import { _decorator, Component, Node, Vec3, Prefab, instantiate, director, Quat, RigidBody } from 'cc';
import { Backpack } from './Backpack';
import { ResourceConfig } from '../resource/ResourceConfig'; // 新增导入
const { ccclass, property } = _decorator;

interface BlockPose {
    offset: Vec3;
    tiltRot: Quat;
}

@ccclass('BackpackView')
export class BackpackView extends Component {
    @property({ tooltip: '第一个槽位离玩家的距离' })
    backOffset: number = 1.0;

    @property({ tooltip: '槽位间距' })
    slotSpacing: number = 0.7;

    @property({ tooltip: '方块高度' })
    blockHeight: number = 0.1;

    @property({ tooltip: '最大后倾距离' })
    maxBackward: number = 0.8;

    @property({ tooltip: '弯曲指数' })
    curvePower: number = 2.0;

    @property({ tooltip: '启用移动弯曲' })
    enableTilt: boolean = true;

    @property({ tooltip: '移动判定速度阈值' })
    moveThreshold: number = 0.5;

    private _backpack: Backpack | null = null;
    private _resourceConfig: ResourceConfig | null = null; // 新增引用
    private _blocksLayer: Node | null = null;
    private _rigidBody: RigidBody | null = null;

    private _blockNodes: Map<number, Node[]> = new Map();
    private _staticPosesAll: BlockPose[] = [];
    private _movingPosesAll: BlockPose[] = [];

    start() {
        this._backpack = this.getComponent(Backpack);
        if (!this._backpack) {
            console.error('BackpackView: 未找到 Backpack 组件');
            return;
        }
        this._resourceConfig = this.getComponent(ResourceConfig);
        if (!this._resourceConfig) {
            console.error('BackpackView: 未找到 ResourceConfig 组件');
            return;
        }

        const scene = director.getScene();
        if (scene) {
            this._blocksLayer = scene.getChildByName('BlocksLayer');
        }
        if (!this._blocksLayer) {
            console.error('BackpackView: 场景中未找到 BlocksLayer 节点');
            return;
        }

        this._rigidBody = this.node.getComponent(RigidBody);
        this.computePoses();
    }

    update(dt: number) {
        if (!this._backpack || !this._resourceConfig) return;
        this.syncBlockCounts();

        let isMoving = false;
        if (this._rigidBody) {
            const vel = new Vec3();
            this._rigidBody.getLinearVelocity(vel);
            const speed = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
            isMoving = speed > this.moveThreshold;
        }
        this.applyPoses(isMoving);
    }



    private syncBlockCounts(): void {
        const types = this._backpack!.getTypes();
        for (let i = 0; i < types.length; i++) {
            const typeName = types[i];
            const visibleCount = this._backpack!.getVisibleCount(typeName);
            let blocks = this._blockNodes.get(i);
            if (!blocks) {
                blocks = [];
                this._blockNodes.set(i, blocks);
            }

            while (blocks.length > visibleCount) {
                const node = blocks.pop();
                if (node) node.destroy();
            }

            // 从 ResourceConfig 获取预制体
            const prefab = this._resourceConfig!.getPrefab(typeName);
            if (!prefab) {
                console.warn(`BackpackView: 未找到类型 ${typeName} 的预制体映射`);
                continue;
            }

            while (blocks.length < visibleCount) {
                const block = instantiate(prefab);
                block.setParent(this._blocksLayer);
                block.setWorldPosition(this.node.getWorldPosition());
                blocks.push(block);
            }
        }
    }

    private computePoses(): void {
        this._staticPosesAll = [];
        this._movingPosesAll = [];

        const maxCount = this._backpack!.maxVisibleBlocks;
        if (maxCount <= 0) return;
        const maxH = (maxCount - 1) * this.blockHeight;

        for (let i = 0; i < maxCount; i++) {
            const h = i * this.blockHeight;
            this._staticPosesAll.push({
                offset: new Vec3(0, h, 0),
                tiltRot: new Quat()
            });

            let d_i = 0;
            let tiltAngle = 0;
            if (this.enableTilt && maxH > 0.001) {
                const normalized = Math.max(0, Math.min(1, h / maxH));
                d_i = this.maxBackward * Math.pow(normalized, this.curvePower);

                let slope = 0;
                if (i < maxCount - 1) {
                    const nextH = (i + 1) * this.blockHeight;
                    const nextD = this.maxBackward * Math.pow(nextH / maxH, this.curvePower);
                    slope = (nextD - d_i) / this.blockHeight;
                } else if (i > 0) {
                    const prevH = (i - 1) * this.blockHeight;
                    const prevD = this.maxBackward * Math.pow(prevH / maxH, this.curvePower);
                    slope = (d_i - prevD) / this.blockHeight;
                }
                tiltAngle = -Math.atan(slope);
            }

            const tiltRot = new Quat();
            Quat.fromAxisAngle(tiltRot, new Vec3(1, 0, 0), tiltAngle);
            this._movingPosesAll.push({
                offset: new Vec3(0, h, -d_i),
                tiltRot: tiltRot
            });
        }
    }

    private applyPoses(isMoving: boolean): void {
        if (!this._backpack) return;

        const playerPos = this.node.getWorldPosition();
        const playerWorldRot = this.node.getWorldRotation();
        const playerEuler = new Vec3();
        playerWorldRot.getEulerAngles(playerEuler);
        const playerYRot = new Quat();
        Quat.fromEuler(playerYRot, 0, playerEuler.y, 0);

        const types = this._backpack.getTypes();

        // 先收集所有有效槽位的索引（数量 > 0 的槽位）
        const activeSlots: { typeName: string; slotIndex: number }[] = [];
        for (let i = 0; i < types.length; i++) {
            const count = this._backpack.getCount(types[i]);
            if (count > 0) {
                activeSlots.push({ typeName: types[i], slotIndex: i });
            }
        }

        // 按有效槽位的顺序重新排列位置
        for (let activeIdx = 0; activeIdx < activeSlots.length; activeIdx++) {
            const { slotIndex } = activeSlots[activeIdx];
            const blocks = this._blockNodes.get(slotIndex);
            if (!blocks || blocks.length === 0) continue;

            // 用 activeIdx 而不是 slotIndex 来计算位置
            const slotLocalOffset = new Vec3(0, 0, -(this.backOffset + activeIdx * this.slotSpacing));
            const slotWorldOffset = new Vec3();
            Vec3.transformQuat(slotWorldOffset, slotLocalOffset, playerYRot);
            const slotBasePos = playerPos.clone().add(slotWorldOffset);

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                const pose = isMoving ? this._movingPosesAll[i] : this._staticPosesAll[i];
                if (!pose) continue;

                const blockWorldOffset = new Vec3();
                Vec3.transformQuat(blockWorldOffset, pose.offset, playerYRot);
                block.setWorldPosition(slotBasePos.clone().add(blockWorldOffset));

                const finalRot = new Quat();
                Quat.multiply(finalRot, playerYRot, pose.tiltRot);
                block.setWorldRotation(finalRot);
            }
        }

        // 清理已注册但数量为 0 的槽位（确保没有残留方块）
        for (let i = 0; i < types.length; i++) {
            const count = this._backpack.getCount(types[i]);
            if (count === 0) {
                const blocks = this._blockNodes.get(i);
                if (blocks && blocks.length > 0) {
                    // 销毁所有残留节点
                    while (blocks.length > 0) {
                        const node = blocks.pop();
                        if (node) node.destroy();
                    }
                }
            }
        }
    }
    /**
* 获取某类型最底层方块的世界位置（供外部飞行动画使用）
* @param typeName 资源类型
* @returns 世界位置，若无则返回 null
*/
    public getBottomBlockWorldPos(typeName: string): Vec3 | null {
        if (!this._backpack) return null;

        const types = this._backpack.getTypes();
        for (let i = 0; i < types.length; i++) {
            if (types[i] === typeName) {
                const blocks = this._blockNodes.get(i);
                if (blocks && blocks.length > 0) {
                    return blocks[0].getWorldPosition().clone();
                }
            }
        }
        return null;
    }
}