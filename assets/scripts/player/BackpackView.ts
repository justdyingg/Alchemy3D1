// assets/scripts/player/BackpackView.ts
import { _decorator, Component, Node, Vec3, Prefab, instantiate, director, Quat, RigidBody } from 'cc';
import { Backpack } from './Backpack';
const { ccclass, property } = _decorator;

interface BlockPose {
    offset: Vec3;   // 相对于槽位基准点的局部偏移（已包含高度和后倾）
    tiltRot: Quat;  // 倾斜旋转（绕世界X轴）
}

@ccclass('BackpackView')
export class BackpackView extends Component {
    @property({ type: Prefab, tooltip: '方块预制体' })
    blockPrefab: Prefab | null = null;

    @property({ tooltip: '第一个槽位离玩家的距离' })
    backOffset: number = 1.0;

    @property({ tooltip: '槽位间距' })
    slotSpacing: number = 0.7;

    @property({ tooltip: '方块高度' })
    blockHeight: number = 0.1;

    @property({ tooltip: '最大后倾距离（最高方块的后移量）' })
    maxBackward: number = 0.8;

    @property({ tooltip: '弯曲指数（>1 越往上越弯）' })
    curvePower: number = 2.0;

    @property({ tooltip: '启用移动弯曲' })
    enableTilt: boolean = true;

    @property({ tooltip: '移动判定速度阈值' })
    moveThreshold: number = 0.5;

    private _backpack: Backpack | null = null;
    private _blocksLayer: Node | null = null;
    private _rigidBody: RigidBody | null = null;

    // 每个槽位的方块节点数组（按槽位索引）
    private _blockNodes: Map<number, Node[]> = new Map();

    // 全局预计算姿态数组（长度 = maxVisibleBlocks）
    private _staticPosesAll: BlockPose[] = [];
    private _movingPosesAll: BlockPose[] = [];

    start() {
        this._backpack = this.getComponent(Backpack);
        if (!this._backpack) {
            console.error('BackpackView: 未找到 Backpack 组件');
            return;
        }
        if (!this.blockPrefab) {
            console.error('BackpackView: 未设置方块预制体');
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

        // 根据最大显示数量预计算姿态（只算一次）
        this.computePoses();
    }

    update(dt: number) {
        if (!this._backpack) return;

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

    /**
     * 同步每个槽位的方块节点数量（不涉及姿态计算）
     */
    private syncBlockCounts(): void {
        const types = this._backpack!.getTypes();
        for (let i = 0; i < types.length; i++) {
            const visibleCount = this._backpack!.getVisibleCount(types[i]);
            let blocks = this._blockNodes.get(i);
            if (!blocks) {
                blocks = [];
                this._blockNodes.set(i, blocks);
            }

            // 删除多余节点
            while (blocks.length > visibleCount) {
                const node = blocks.pop();
                if (node) node.destroy();
            }
            // 创建缺失节点
            while (blocks.length < visibleCount) {
                const block = instantiate(this.blockPrefab!);
                block.setParent(this._blocksLayer);
                block.setWorldPosition(this.node.getWorldPosition());
                blocks.push(block);
            }
        }
    }

    /**
     * 预计算整条曲线（基于最大显示数量）
     */
    private computePoses(): void {
        this._staticPosesAll = [];
        this._movingPosesAll = [];

        const maxCount = this._backpack!.maxVisibleBlocks;
        if (maxCount <= 0) return;

        const maxH = (maxCount - 1) * this.blockHeight;

        for (let i = 0; i < maxCount; i++) {
            const h = i * this.blockHeight;

            // 静止姿态：竖直，无偏移
            this._staticPosesAll.push({
                offset: new Vec3(0, h, 0),
                tiltRot: new Quat()
            });

            // 移动姿态
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

    /**
     * 为所有方块设置世界位置和旋转
     */
    private applyPoses(isMoving: boolean): void {
        if (!this._backpack) return;

        const playerPos = this.node.getWorldPosition();
        const playerWorldRot = this.node.getWorldRotation();
        const playerEuler = new Vec3();
        playerWorldRot.getEulerAngles(playerEuler);
        const playerYRot = new Quat();
        Quat.fromEuler(playerYRot, 0, playerEuler.y, 0);

        const types = this._backpack.getTypes();
        for (let slotIdx = 0; slotIdx < types.length; slotIdx++) {
            const blocks = this._blockNodes.get(slotIdx);
            if (!blocks || blocks.length === 0) continue;

            // 槽位基准点（世界坐标）
            const slotLocalOffset = new Vec3(0, 0, -(this.backOffset + slotIdx * this.slotSpacing));
            const slotWorldOffset = new Vec3();
            Vec3.transformQuat(slotWorldOffset, slotLocalOffset, playerYRot);
            const slotBasePos = playerPos.clone().add(slotWorldOffset);

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                // 直接使用全局姿态表（索引 i 对应曲线从底部数第 i 个姿态）
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
    }
}