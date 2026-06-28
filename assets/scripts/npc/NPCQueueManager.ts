// assets/scripts/npc/NPCQueueManager.ts
import { _decorator, Component, Node, Prefab, instantiate, Vec3, Quat, tween } from 'cc';
import { NPCBehavior } from './NPCBehavior';
import { MultiDepositZone } from '../alchemy/MultiDepositZone';
import { AutoOutputZone } from '../alchemy/AutoOutputZone';

const { ccclass, property } = _decorator;

@ccclass('NPCQueueManager')
export class NPCQueueManager extends Component {
    @property({ type: Prefab, tooltip: 'NPC 预制体' })
    npcPrefab: Prefab | null = null;

    @property({ type: [Node], tooltip: '排队等待点列表（从队首到队尾）' })
    queuePositions: Node[] = [];

    @property({ type: Node, tooltip: '交易点' })
    tradePoint: Node | null = null;

    @property({ type: Node, tooltip: '离开点' })
    leavePoint: Node | null = null;

    @property({ type: Node, tooltip: '交易朝向参考点（可选）' })
    tradeLookAtTarget: Node | null = null;

    @property({ type: MultiDepositZone, tooltip: '区域 C（多类型卸货区）' })
    depositZone: MultiDepositZone | null = null;

    @property({ type: AutoOutputZone, tooltip: '区域 D（金币产出区）' })
    outputZone: AutoOutputZone | null = null;

    @property({ tooltip: '最大排队 NPC 数量' })
    maxNPC: number = 10;

    @property({ tooltip: '排队位置移动动画时长（秒）' })
    queueShiftDuration: number = 0.3;

    private _queue: NPCBehavior[] = [];
    private _tradingNPC: NPCBehavior | null = null;

    start() {
        for (let i = 0; i < this.maxNPC && i < this.queuePositions.length; i++) {
            this.spawnNPC(i);
        }
        this.activateNextNPC();
    }

    private spawnNPC(queueIndex: number): void {
        if (!this.npcPrefab) return;
        const npcNode = instantiate(this.npcPrefab);
        npcNode.setParent(this.node.parent);
        const npcBehavior = npcNode.getComponent(NPCBehavior);
        if (!npcBehavior) {
            console.error('NPC 预制体缺少 NPCBehavior 组件');
            npcNode.destroy();
            return;
        }

        npcBehavior.depositZone = this.depositZone;
        npcBehavior.outputZone = this.outputZone;
        if (this.tradeLookAtTarget) {
            npcBehavior.tradeLookAtTarget = this.tradeLookAtTarget;
        }

        // 放置到排队点并设置朝向（面朝交易点）
        if (queueIndex < this.queuePositions.length) {
            npcNode.setWorldPosition(this.queuePositions[queueIndex].getWorldPosition());
            const lookTarget = this.tradePoint?.getWorldPosition();
            if (lookTarget) {
                let dir = new Vec3();
                Vec3.subtract(dir, lookTarget, npcNode.getWorldPosition());
                dir.y = 0;
                if (dir.lengthSqr() > 0.01) {
                    // 读取 NPC 的 flipForwardDirection 属性
                    if (npcBehavior.flipForwardDirection) {
                        dir.multiplyScalar(-1);
                    }
                    npcNode.rotation = Quat.fromViewUp(new Quat(), dir.normalize());
                }
            }
        }

        npcBehavior.setOnDestroyed(() => {
            this.onNPCDestroyed(npcBehavior);
        });
        npcBehavior.setOnTradeFinished(() => {
            this._tradingNPC = null;
            this.activateNextNPC();
        });

        this._queue.push(npcBehavior);
    }

    private activateNextNPC(): void {
        if (this._tradingNPC) return;
        if (this._queue.length === 0) return;
        const npc = this._queue.shift()!;
        this._tradingNPC = npc;
        const startPos = npc.node.getWorldPosition();
        const tradePos = this.tradePoint?.getWorldPosition() || startPos;
        const leavePos = this.leavePoint?.getWorldPosition() || tradePos;
        npc.startMovingToTargets([startPos, tradePos, leavePos], 1);
    }

    private onNPCDestroyed(npc: NPCBehavior): void {
        const index = this._queue.indexOf(npc);
        if (index !== -1) {
            this._queue.splice(index, 1);
        } else if (this._tradingNPC === npc) {
            this._tradingNPC = null;
        }
        this.shiftQueuePositions();
        const newIndex = this._queue.length;
        this.spawnNPC(newIndex);
        this.activateNextNPC();
    }

    private shiftQueuePositions(): void {
        for (let i = 0; i < this._queue.length; i++) {
            const npc = this._queue[i];
            if (i < this.queuePositions.length) {
                const targetPos = this.queuePositions[i].getWorldPosition();
                tween(npc.node)
                    .to(this.queueShiftDuration, { position: targetPos })
                    .start();
            }
        }
    }
}