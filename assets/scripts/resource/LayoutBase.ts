// assets/scripts/resource/LayoutBase.ts
import { _decorator, Component, Node, Vec3, Prefab, instantiate } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('LayoutBase')
export abstract class LayoutBase extends Component {
    @property({ type: Prefab, tooltip: '方块预制体' })
    blockPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '方块放置的根节点' })
    layoutRoot: Node | null = null;

    public abstract getNextPosition(): Vec3;
    public spawnBlock(): Node | null {
        if (!this.blockPrefab || !this.layoutRoot) return null;
        const block = instantiate(this.blockPrefab);
        block.setParent(this.layoutRoot);
        block.setWorldPosition(this.getNextPosition());
        return block;
    }
    public abstract removeBlock(): Node | null;
    public abstract hasBlocks(): boolean;
    public abstract getBlockCount(): number;
    public abstract getBottomBlockWorldPos(): Vec3 | null;
    public abstract getTopBlockWorldPos(): Vec3 | null;

    /** 添加逻辑单位（会根据 unitsPerBlock 自动管理视觉方块） */
    public abstract addUnits(count: number): void;
    /** 移除逻辑单位，返回实际移除的逻辑单位数 */
    public abstract removeUnits(count: number): number;
}