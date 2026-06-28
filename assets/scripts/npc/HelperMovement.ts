// assets/scripts/npc/HelperMovement.ts
import { _decorator, Component, RigidBody, Vec3 } from 'cc';
import { TargetLock } from '../player/TargetLock';
import { Attack } from '../player/Attack';

const { ccclass, property } = _decorator;

@ccclass('HelperMovement')
export class HelperMovement extends Component {
    @property({ tooltip: '移动速度' })
    moveSpeed: number = 4;

    @property({ tooltip: '攻击范围（与 Attack 的攻击范围保持一致）' })
    attackRange: number = 1.5;

    @property({ tooltip: '卡住检测距离（小于此距离视为卡住）' })
    stuckDistance: number = 0.1;

    @property({ tooltip: '卡住判定时间（秒）' })
    stuckTime: number = 0.5;

    @property({ tooltip: '绕行持续时间（秒）' })
    evadeDuration: number = 1.0;

    @property({ tooltip: '绕行偏移角度（度），随机取正负' })
    evadeAngle: number = 45;

    @property({ tooltip: '如果模型的前方是 +Z，请勾选此项（引擎默认为 -Z）' })
    flipForwardDirection: boolean = false;

    private _rigidBody: RigidBody | null = null;
    private _targetLock: TargetLock | null = null;
    private _attack: Attack | null = null;

    private _lastPosition: Vec3 = new Vec3();
    private _stuckTimer: number = 0;
    private _isEvading: boolean = false;
    private _evadeTimer: number = 0;
    private _evadeDirection: Vec3 = new Vec3();

    start() {
        this._rigidBody = this.getComponent(RigidBody);
        this._targetLock = this.getComponent(TargetLock);
        this._attack = this.getComponent(Attack);
        this._lastPosition.set(this.node.getWorldPosition());
    }

    update(dt: number) {
        if (!this._targetLock || !this._rigidBody) return;

        const target = this._targetLock.lockedTarget;
        const myPos = this.node.getWorldPosition();

        // 卡住检测
        const moved = Vec3.distance(myPos, this._lastPosition);
        if (moved < this.stuckDistance) {
            this._stuckTimer += dt;
        } else {
            this._stuckTimer = 0;
        }
        this._lastPosition.set(myPos);

        if (this._stuckTimer >= this.stuckTime && target && !this._isEvading) {
            this.startEvasion(myPos);
        }

        if (this._isEvading) {
            this._evadeTimer -= dt;
            if (this._evadeTimer <= 0) {
                this._isEvading = false;
                this._stuckTimer = 0;
            }
        }

        if (!target) {
            const vel = new Vec3();
            this._rigidBody.getLinearVelocity(vel);
            this._rigidBody.setLinearVelocity(new Vec3(0, vel.y, 0));
            return;
        }

        const targetPos = target.getWorldPosition();
        const distance = Vec3.distance(myPos, targetPos);

        // 计算指向目标的方向（世界空间）
        const toTarget = new Vec3();
        Vec3.subtract(toTarget, targetPos, myPos);
        toTarget.y = 0;
        if (toTarget.lengthSqr() > 0.01) {
            toTarget.normalize();
        }

        if (distance <= this.attackRange) {
            // 停止移动
            const vel = new Vec3();
            this._rigidBody.getLinearVelocity(vel);
            this._rigidBody.setLinearVelocity(new Vec3(0, vel.y, 0));

            // 主动面向目标（根据 flipForwardDirection 修正）
            const faceDir = this.flipForwardDirection ? toTarget.clone().multiplyScalar(-1) : toTarget;
            if (faceDir.lengthSqr() > 0.01) {
                this.node.forward = faceDir;
            }
            return;
        }

        // 需要移动
        let moveDir: Vec3;
        if (this._isEvading) {
            moveDir = this._evadeDirection.clone();
        } else {
            moveDir = toTarget.clone();
        }

        // 设置移动速度
        const vel2 = new Vec3();
        this._rigidBody.getLinearVelocity(vel2);
        this._rigidBody.setLinearVelocity(new Vec3(moveDir.x * this.moveSpeed, vel2.y, moveDir.z * this.moveSpeed));

        // 移动时面朝移动方向（同样根据 flipForwardDirection 修正）
        const faceDir = this.flipForwardDirection ? moveDir.clone().multiplyScalar(-1) : moveDir;
        if (faceDir.lengthSqr() > 0.01) {
            this.node.forward = faceDir;
        }
    }

    private startEvasion(myPos: Vec3): void {
        this._isEvading = true;
        this._evadeTimer = this.evadeDuration;
        const forward = this.node.forward.clone();
        forward.y = 0;
        if (forward.lengthSqr() < 0.01) {
            forward.set(Vec3.UNIT_Z);
        }
        forward.normalize();
        const angle = this.evadeAngle * (Math.random() < 0.5 ? 1 : -1);
        const radians = angle * Math.PI / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        this._evadeDirection.set(
            forward.x * cos + forward.z * sin,
            0,
            -forward.x * sin + forward.z * cos
        );
        this._evadeDirection.normalize();
    }
}