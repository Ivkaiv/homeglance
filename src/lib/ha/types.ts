/**
 * Базовые типы для Home Assistant.
 * Соответствуют формату WebSocket API HA.
 */

export type EntityId = string; // 'sensor.xxx', 'light.yyy'

export interface HAState {
  entity_id: EntityId;
  state: string;
  attributes: Record<string, any> & {
    friendly_name?: string;
    unit_of_measurement?: string;
    icon?: string;
    device_class?: string;
  };
  last_changed: string;
  last_updated: string;
}

export type StatesMap = Record<EntityId, HAState>;

/** Из config/area_registry/list */
export interface HAArea {
  area_id: string;
  name: string;
  icon?: string | null;
}

/** Из config/device_registry/list */
export interface HADevice {
  id: string;
  name: string | null;
  name_by_user?: string | null;
  area_id: string | null;
  manufacturer?: string | null;
  model?: string | null;
}

/** Из config/entity_registry/list */
export interface HAEntityRegistry {
  entity_id: EntityId;
  name?: string | null;
  device_id?: string | null;
  area_id?: string | null;
  platform?: string;
  device_class?: string | null;
  /** Если true, сущность скрыта в HA (системные/диагностические) — не показываем в каталоге */
  hidden_by?: string | null;
  disabled_by?: string | null;
}

export interface HARegistries {
  areas: Record<string, HAArea>; // area_id → area
  devices: Record<string, HADevice>; // device_id → device
  entities: Record<EntityId, HAEntityRegistry>; // entity_id → entity registry
}

export interface HAConnection {
  url: string;
  token: string;
}

export interface ConnectionStatus {
  status: 'idle' | 'connecting' | 'connected' | 'auth-failed' | 'error' | 'disconnected';
  error?: string;
}

export interface ServiceCallData {
  [key: string]: any;
}
