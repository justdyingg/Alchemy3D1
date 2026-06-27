import { _decorator, Component, Node, Vec3, Prefab, instantiate, director, Quat } from 'cc';
import { Backpack } from './Backpack';
const { ccclass, property } = _decorator;

@ccclass('BackpackView')
export class BackpackView extends Component {
    @property({ type: Prefab, tooltip: '方块预制体' })
    blockPrefab: Prefab | null = null;

    @property({ tooltip: '第一个身体节离玩家的距离' })
    backOffset: number = 1.0;

    @property({ tooltip: '身体节间距' })
    slotSpacing: number = 0.7;

    @property({ tooltip: '方块高度' })
    blockHeight: number = 0.1;

    @property({ tooltip: '跟随速度（越小越弯曲）' })
    followSpeed: number = 10;

    private _backpack: Backpack | null = null;
    private _blocksLayer: Node | null = null;
    private _baseNodes: Node[] = [];
    private _blockNodes: Map<number, Node[]> = new Map();

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
        if (scene) this._blocksLayer = scene.getChildByName('BlocksLayer');
        if (!this._blocksLayer) {
            console.error('BackpackView: 场景中未找到 BlocksLayer 节点');
            return;
        }
        this.createBaseNodes();
    }

    private createBaseNodes(): void {
        const types = this._backpack!.getTypes();
        for (let i = 0; i < types.length; i++) {
            const baseNode = new Node(`Base_${types[i]}`);
            baseNode.setParent(this._blocksLayer);
            baseNode.setWorldPosition(this.node.getWorldPosition());
            this._baseNodes.push(baseNode);
            this._blockNodes.set(i, []);
        }
    }

    update(dt: number) {
        if (!this._backpack || this._baseNodes.length === 0) return;
        this.updateBasePositions(dt);
        this.syncBlockCounts();
        this.updateBlockPositions(dt);
    }

    private updateBasePositions(dt: number): void {
        const playerPos = this.node.getWorldPosition();
        const backDir = this.node.forward.clone().normalize().multiplyScalar(1);
        for (let i = 0; i < this._baseNodes.length; i++) {
            const targetPos = playerPos.clone();
            targetPos.add(backDir.clone().multiplyScalar(this.backOffset + i * this.slotSpacing));
            const cur = this._baseNodes[i].getWorldPosition();
            const newPos = new Vec3();
            Vec3.lerp(newPos, cur, targetPos, dt * this.followSpeed);
            this._baseNodes[i].setWorldPosition(newPos);
        }
    }

    private syncBlockCounts(): void {
        const types = this._backpack!.getTypes();
        for (let i = 0; i < types.length; i++) {
            const visibleCount = this._backpack!.getVisibleCount(types[i]);
            let blocks = this._blockNodes.get(i);
            if (!blocks) { blocks = []; this._blockNodes.set(i, blocks); }
            while (blocks.length > visibleCount) {
                const node = blocks.pop();
                if (node) node.destroy();
            }
            while (blocks.length < visibleCount) {
                const block = instantiate(this.blockPrefab!);
                block.setParent(this._blocksLayer);
                block.setWorldPosition(this._baseNodes[i].getWorldPosition());
                blocks.push(block);
            }
        }
    }

    private updateBlockPositions(dt: number): void {
        // 获取玩家水平朝向（只取 Y 轴旋转）
        const playerWorldRot = this.node.getWorldRotation();
        const playerEuler = new Vec3();
        playerWorldRot.getEulerAngles(playerEuler);
        const targetYRot = new Quat();
        Quat.fromEuler(targetYRot, 0, playerEuler.y, 0);

        for (let i = 0; i < this._baseNodes.length; i++) {
            const blocks = this._blockNodes.get(i);
            if (!blocks || blocks.length === 0) continue;
            const basePos = this._baseNodes[i].getWorldPosition();

            if (blocks.length > 0) {
                const targetPos0 = basePos.clone();
                targetPos0.y += this.blockHeight * 0.5;
                const cur0 = blocks[0].getWorldPosition();
                targetPos0.x = basePos.x; targetPos0.z = basePos.z;
                const newPos0 = new Vec3();
                Vec3.lerp(newPos0, cur0, targetPos0, dt * this.followSpeed);
                blocks[0].setWorldPosition(newPos0);
                blocks[0].setWorldRotation(targetYRot);
            }

            for (let j = 1; j < blocks.length; j++) {
                const prevPos = blocks[j - 1].getWorldPosition();
                const targetPos = prevPos.clone();
                targetPos.y += this.blockHeight;
                targetPos.x = basePos.x; targetPos.z = basePos.z;
                const cur = blocks[j].getWorldPosition();
                const newPos = new Vec3();
                Vec3.lerp(newPos, cur, targetPos, dt * this.followSpeed);
                blocks[j].setWorldPosition(newPos);
                blocks[j].setWorldRotation(targetYRot);
            }
        }
    }
}