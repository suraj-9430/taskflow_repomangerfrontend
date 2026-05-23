import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Createandmanage } from './createandmanage';

describe('Createandmanage', () => {
  let component: Createandmanage;
  let fixture: ComponentFixture<Createandmanage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Createandmanage]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Createandmanage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
