// assets/scripts/npc/NPCBehavior.ts
import { _decorator, Component, Node, Vec3, Quat, tween, Tween, Camera, director, screen, instantiate } from 'cc';
import { MultiDepositZone } from '../alchemy/MultiDepositZone';
import { AutoOutputZone } from '../alchemy/AutoOutputZone';
import { LayoutBase } from '../resource/LayoutBase';
import { OrderBubbleUI } from './OrderBubbleUI';

const { ccclass, property } = _decorator;

@ccclass('DemandConfig')
export class DemandConfig {
    @property({ tooltip: '资源类型名称' })
    type: string = 'gold';
    @property({ tooltip: '最小需求数量' })
    min: number = 1;
    @property({ tooltip: '最大需求数量' })
    max: number = 3;
}

@ccclass('NPCBehavior')
export class NPCBehavior extends Component {
    @property({ type: [Node], tooltip: '移动路径点列表（已弃用，由队列管理器控制）' })
    waypoints: Node[] = [];

    @property({ tooltip: '哪一个是交易点（对应 waypoints 数组的索引）' })
    tradePointIndex: number = 1;

    @property({ type: MultiDepositZone, tooltip: '区域 C（多类型卸货区）' })
    depositZone: MultiDepositZone | null = null;

    @property({ type: AutoOutputZone, tooltip: '区域 D（金币产出区）' })
    outputZone: AutoOutputZone | null = null;

    @property({ type: [DemandConfig], tooltip: '可能的需求列表，随机选择一个' })
    demandConfigs: DemandConfig[] = [];

    @property({ tooltip: '每满足 1 单位需求，给予的金币数量' })
    goldPerUnit: number = 1;

    @property({ tooltip: '每段路径移动时间（秒）' })
    moveDuration: number = 1.0;

    @property({ tooltip: '吸收方块飞行弧线高度' })
    flyArcHeight: number = 1.5;

    @property({ tooltip: '吸收方块飞行时长（秒）' })
    flyDuration: number = 0.2;

    @property({ type: Node, tooltip: '到达交易点后强制面向的节点（可选）' })
    tradeLookAtTarget: Node | null = null;

    // 新增：模型前方方向修正
    @property({ tooltip: '如果模型的前方是 +Z，请勾选此项（引擎默认为 -Z）' })
    flipForwardDirection: boolean = false;

    // 内部状态
    private _currentWaypointIndex: number = 0;
    private _isTrading: boolean = false;
    private _demandType: string = '';
    private _demandCount: number = 0;
    private _tween: Tween<any> | null = null;
    private _destroyTimer: number = 0;
    private _leaveStarted: boolean = false;
    private _orderBubble: OrderBubbleUI | null = null;
    private _onDestroyed: (() => void) | null = null;

    // 外部移动控制
    private _movingTargets: Vec3[] = [];
    private _currentTargetIndex: number = 0;
    private _tradePointIndexInPath: number = -1;
    private _isMovingToTargets: boolean = false;
    private _onTradeFinished: (() => void) | null = null;

    start() {
        this._orderBubble = this.getComponent(OrderBubbleUI);
    }

    public setOnDestroyed(callback: () => void): void {
        this._onDestroyed = callback;
    }

    public setOnTradeFinished(callback: () => void): void {
        this._onTradeFinished = callback;
    }

    /**
     * 沿世界坐标点移动，支持在交易点暂停并等待交易完成
     */
    public startMovingToTargets(positions: Vec3[], tradePointIndex: number = -1): void {
        if (positions.length === 0) return;
        this._movingTargets = positions;
        this._currentTargetIndex = 0;
        this._tradePointIndexInPath = tradePointIndex;
        this._isMovingToTargets = true;
        this.moveToNextTarget();
    }

    private moveToNextTarget(): void {
        if (!this._isMovingToTargets) return;
        if (this._currentTargetIndex >= this._movingTargets.length) {
            this._isMovingToTargets = false;
            return;
        }
        const targetPos = this._movingTargets[this._currentTargetIndex];
        const startPos = this.node.getWorldPosition();
        let direction = new Vec3();
        Vec3.subtract(direction, targetPos, startPos);
        direction.y = 0;
        if (direction.lengthSqr() > 0.01) {
            // 如果模型前方是 +Z，需要取反方向
            if (this.flipForwardDirection) {
                direction.multiplyScalar(-1);
            }
            const targetRot = Quat.fromViewUp(new Quat(), direction.normalize());
            this._tween = tween(this.node)
                .parallel(
                    tween().to(this.moveDuration, { position: targetPos }),
                    tween().to(this.moveDuration, { rotation: targetRot })
                )
                .call(() => {
                    this.onTargetReached(this._currentTargetIndex);
                })
                .start();
        } else {
            this._tween = tween(this.node)
                .to(this.moveDuration, { position: targetPos })
                .call(() => {
                    this.onTargetReached(this._currentTargetIndex);
                })
                .start();
        }
    }

    private onTargetReached(index: number): void {
        if (index === this._tradePointIndexInPath) {
            // 强制朝向目标节点
            if (this.tradeLookAtTarget) {
                const lookPos = this.tradeLookAtTarget.getWorldPosition();
                let dir = new Vec3();
                Vec3.subtract(dir, lookPos, this.node.getWorldPosition());
                dir.y = 0;
                if (dir.lengthSqr() > 0.01) {
                    if (this.flipForwardDirection) {
                        dir.multiplyScalar(-1);
                    }
                    this.node.rotation = Quat.fromViewUp(new Quat(), dir.normalize());
                }
            }
            this.enterTrade();
        } else {
            this._currentTargetIndex++;
            this.moveToNextTarget();
        }
    }

    private resumeMoving(): void {
        if (this._isMovingToTargets) {
            this._currentTargetIndex++;
            this.moveToNextTarget();
        }
    }

    private enterTrade(): void {
        if (this.demandConfigs.length > 0) {
            const config = this.demandConfigs[Math.floor(Math.random() * this.demandConfigs.length)];
            this._demandType = config.type;
            this._demandCount = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
        } else {
            this._leaveStarted = true;
            this.resumeMoving();
            return;
        }
        if (this._orderBubble) {
            this._orderBubble.showOrder(this._demandType, this._demandCount);
        }
        this._isTrading = true;
    }

    update(dt: number): void {
        if (this._leaveStarted) {
            this.checkLeaveAndDestroy(dt);
            return;
        }
        if (!this._isTrading) return;
        if (!this.depositZone || !this.depositZone.isPlayerInside()) return;

        const layout = this.depositZone.getLayoutForType(this._demandType);
        if (!layout) return;

        if (layout.getBlockCount() >= this._demandCount) {
            this.startTransaction(layout);
        }
    }

    private startTransaction(layout: LayoutBase): void {
        this._isTrading = false;
        const totalNeeded = this._demandCount;
        let taken = 0;

        const targetPos = this.node.getWorldPosition().clone();
        targetPos.y += 1.5;

        const takeNext = (): void => {
            if (taken >= totalNeeded) {
                if (this.outputZone) {
                    const coinCount = totalNeeded * this.goldPerUnit;
                    this.outputZone.addItem(targetPos, coinCount);
                }
                this._orderBubble?.hideOrder();
                this._onTradeFinished?.();
                this._leaveStarted = true;
                this.resumeMoving();
                return;
            }

            const topPos = layout.getTopBlockWorldPos();
            if (topPos) {
                layout.removeUnits(1);
                if (layout.blockPrefab) {
                    const tempBlock = instantiate(layout.blockPrefab);
                    tempBlock.setParent(this.node);
                    tempBlock.setWorldPosition(topPos);
                    this.flyBlockToNPC(tempBlock, targetPos, () => {
                        tempBlock.destroy();
                        taken++;
                        takeNext();
                    });
                } else {
                    taken++;
                    takeNext();
                }
            } else {
                taken++;
                takeNext();
            }
        };

        takeNext();
    }

    private flyBlockToNPC(block: Node, target: Vec3, onComplete: () => void): void {
        const start = block.getWorldPosition();
        const mid = new Vec3();
        Vec3.add(mid, start, target).multiplyScalar(0.5);
        mid.y += this.flyArcHeight;

        const obj = { t: 0 };
        tween(obj)
            .to(this.flyDuration, { t: 1 }, {
                onUpdate: () => {
                    const t = obj.t;
                    const u = 1 - t;
                    const pos = new Vec3();
                    pos.x = u * u * start.x + 2 * u * t * mid.x + t * t * target.x;
                    pos.y = u * u * start.y + 2 * u * t * mid.y + t * t * target.y;
                    pos.z = u * u * start.z + 2 * u * t * mid.z + t * t * target.z;
                    block.setWorldPosition(pos);
                },
                onComplete: () => {
                    onComplete();
                }
            })
            .start();
    }

    private checkLeaveAndDestroy(dt: number): void {
        const camera = director.getScene()?.getComponentInChildren(Camera);
        if (!camera) return;
        const screenPos = camera.worldToScreen(this.node.getWorldPosition());
        const winSize = screen.windowSize;
        if (screenPos.z < 0 || screenPos.x < -200 || screenPos.x > winSize.width + 200 ||
            screenPos.y < -200 || screenPos.y > winSize.height + 200) {
            this._destroyTimer += dt;
        } else {
            this._destroyTimer = 0;
        }
        if (this._destroyTimer > 1.0) {
            this.destroyNPC();
        }
    }

    private destroyNPC(): void {
        this._onDestroyed?.();
        this.node.destroy();
    }

    onDestroy(): void {
        if (this._tween) {
            this._tween.stop();
        }
    }
}