import { _decorator, Component, Node, Prefab, instantiate, UITransform, Vec2, Vec3, input, Input, EventTouch, director, Camera, Canvas } from 'cc';
import { PlayerMovement } from '../player/PlayerMovement';
import { CameraFollow } from './CameraFollow';
import { HpBarManager } from '../ui/HpBarManager';
import { Backpack } from '../player/Backpack';
const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(Prefab) joystickPrefab: Prefab | null = null;
    @property(Prefab) playerPrefab: Prefab | null = null;
    @property(Node) spawnPoint: Node | null = null;
    @property(Node) playerNode: Node | null = null;

    private _joystick: Node | null = null;
    private _joystickScript: any = null;
    private _playerMovement: PlayerMovement | null = null;

    start() {
        if (this.playerPrefab && this.spawnPoint) {
            const player = instantiate(this.playerPrefab);
            player.setPosition(this.spawnPoint.position);
            this.node.parent?.addChild(player);
            this.playerNode = player;
            this._playerMovement = player.getComponent(PlayerMovement);

            const camera = director.getScene()?.getComponentInChildren(Camera);
            if (camera) {
                const follow = camera.node.getComponent(CameraFollow);
                if (follow) follow.target = player;
            }

            if (HpBarManager.instance) {
                HpBarManager.instance.setPlayerNode(player);
            }

            const backpack = player.getComponent(Backpack);
            if (backpack) {
                backpack.registerType('stone', 300);
                console.log('GameManager: 已注册原材料类型 stone');
            }
        } else if (this.playerNode) {
            this._playerMovement = this.playerNode.getComponent(PlayerMovement);
        }

        input.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
    }

    private onTouchStart(event: EventTouch) {
        if (this._joystick) return;
        const touchPos = event.getUILocation();
        const canvas = director.getScene()?.getComponentInChildren(Canvas);
        if (!canvas) return;
        const canvasTransform = canvas.node.getComponent(UITransform);
        if (!canvasTransform) return;
        const localPos = canvasTransform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));

        this._joystick = instantiate(this.joystickPrefab!);
        this._joystick.setParent(canvas.node);
        this._joystick.setPosition(localPos.x, localPos.y, 0);
        this._joystickScript = this._joystick.getComponent('Joystick');
    }

    private onTouchMove(event: EventTouch) {
        if (!this._joystickScript) return;
        const touchPos = event.getUILocation();
        this._joystickScript?.updateTouch(touchPos);
        const dir = this._joystickScript?.getDirection();
        if (dir && this._playerMovement) {
            this._playerMovement.setMoveDirection(new Vec3(dir.x, 0, -dir.y));
        }
    }

    private onTouchEnd(event: EventTouch) {
        if (this._joystick) {
            this._joystick.destroy();
            this._joystick = null;
            this._joystickScript = null;
        }
        if (this._playerMovement) {
            this._playerMovement.setMoveDirection(new Vec3());
        }
    }
}