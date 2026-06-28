// assets/scripts/alchemy/ZoneA.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3, tween, Collider, ITriggerEvent } from 'cc';
import { Backpack } from '../player/Backpack';
import { BackpackView } from '../player/BackpackView';
const { ccclass, property } = _decorator;

@ccclass('ZoneA')
export class ZoneA extends Component {
    @property({ type: Prefab, tooltip: 'A 区域显示的方块预制体（原材料）' })
    blockPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '显示方块的父节点' })
    displayRoot: Node | null = null;

    @property({ tooltip: '卸货间隔（秒）' })
    unloadInterval: number = 0.2;

    @property({ tooltip: '飞行动画时长（秒）' })
    flyDuration: number = 0.2;

    @property({ tooltip: '飞行弧线高度' })
    flyArcHeight: number = 1.5;

    @property({ tooltip: '最大显示方块数' })
    maxDisplay: number = 25;

    // 数据层：A 区域存储的原材料数量（无上限）
    private _stoneCount: number = 0;

    // 表现层：当前显示的方块节点列表
    private _displayBlocks: Node[] = [];

    // 卸货计时器
    private _unloadTimer: number = 0;
    private _isPlayerInside: boolean = false;

    // 玩家背包引用
    private _playerBackpack: Backpack | null = null;
    private _playerBackpackView: BackpackView | null = null;

    start() {
        // 监听触发器
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onPlayerEnter, this);
            collider.on('onTriggerExit', this.onPlayerLeave, this);
        }
    }

    private onPlayerEnter(event: ITriggerEvent) {
        const other = event.otherCollider.node;
        // 检查是否是玩家（通过是否有 Backpack 组件判断）
        const backpack = other.getComponent(Backpack);
        if (backpack) {
            this._playerBackpack = backpack;
            this._playerBackpackView = other.getComponent(BackpackView);
            this._isPlayerInside = true;
            this._unloadTimer = 0; // 立即开始第一次卸货
            console.log('ZoneA: 玩家进入');
        }
    }

    private onPlayerLeave(event: ITriggerEvent) {
        const other = event.otherCollider.node;
        if (other.getComponent(Backpack)) {
            this._isPlayerInside = false;
            this._playerBackpack = null;
            this._playerBackpackView = null;
            console.log('ZoneA: 玩家离开');
        }
    }

    update(dt: number) {
        if (!this._isPlayerInside || !this._playerBackpack) return;

        this._unloadTimer += dt;
        if (this._unloadTimer >= this.unloadInterval) {
            this._unloadTimer = 0;
            this.tryUnload();
        }
    }

    /**
     * 尝试从玩家背包卸下一个原材料
     */
    private tryUnload(): void {
        if (!this._playerBackpack || !this._playerBackpackView) return;

        // 检查玩家是否有原材料
        const stoneCount = this._playerBackpack.getCount('stone');
        if (stoneCount <= 0) return;

        // 获取玩家背上最底层原材料方块的世界位置
        const flyStartPos = this._playerBackpackView.getBottomBlockWorldPos('stone');
        if (!flyStartPos) return;

        // 从背包移除 1 个原材料
        const removed = this._playerBackpack.removeItem('stone', 1);
        if (removed <= 0) return;

        // 数据层：A 区域计数增加
        this._stoneCount++;

        // 表现层：创建飞行方块
        this.spawnFlyingBlock(flyStartPos);
    }

    /**
     * 创建一个方块从起点飞到 A 区域堆叠顶部
     */
    private spawnFlyingBlock(startPos: Vec3): void {
        if (!this.blockPrefab || !this.displayRoot) return;

        // 计算终点位置：A 区域显示堆叠的顶部
        const endPos = this.getNextDisplayPosition();

        // 计算贝塞尔控制点（起点和终点的中点，向上抬高）
        const midPoint = new Vec3();
        Vec3.add(midPoint, startPos, endPos);
        midPoint.multiplyScalar(0.5);
        midPoint.y += this.flyArcHeight;

        // 创建临时方块节点
        const block = instantiate(this.blockPrefab);
        block.setParent(this.displayRoot);
        block.setWorldPosition(startPos);

        // 用 tween 播放贝塞尔曲线动画
        const tempObj = { t: 0 };
        tween(tempObj)
            .to(this.flyDuration, { t: 1 }, {
                onUpdate: () => {
                    const t = tempObj.t;
                    // 二次贝塞尔：B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
                    const u = 1 - t;
                    const pos = new Vec3();
                    pos.x = u * u * startPos.x + 2 * u * t * midPoint.x + t * t * endPos.x;
                    pos.y = u * u * startPos.y + 2 * u * t * midPoint.y + t * t * endPos.y;
                    pos.z = u * u * startPos.z + 2 * u * t * midPoint.z + t * t * endPos.z;
                    block.setWorldPosition(pos);
                },
                onComplete: () => {
                    // 动画结束，方块归位
                    block.setWorldPosition(endPos);
                    // 如果显示数量超过上限，移除最旧的
                    this._displayBlocks.push(block);
                    while (this._displayBlocks.length > this.maxDisplay) {
                        const old = this._displayBlocks.shift();
                        if (old) old.destroy();
                        // 注意：数据层的 _stoneCount 不减少，只是视觉上隐藏旧方块
                    }
                }
            })
            .start();
    }

    /**
     * 计算下一个方块应该放置的位置（A 区域堆叠顶部）
     */
    private getNextDisplayPosition(): Vec3 {
        if (this._displayBlocks.length > 0) {
            // 在最后一个方块上方
            const lastBlock = this._displayBlocks[this._displayBlocks.length - 1];
            const pos = lastBlock.getWorldPosition().clone();
            pos.y += this.blockPrefab?.data?.scale?.y ?? 0.3;
            return pos;
        }
        // 第一个方块：放在 A 区域节点位置上方
        const pos = this.node.getWorldPosition().clone();
        pos.y += 0.15;
        return pos;
    }
}