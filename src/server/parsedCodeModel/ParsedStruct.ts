import { ParsedContract } from './parsedContract';
import { FindTypeReferenceLocationResult, ParsedCode } from './parsedCode';
import { ParsedDeclarationType } from './parsedDeclarationType';
import { ParsedStructVariable } from './ParsedStructVariable';
import { ParsedDocument } from './ParsedDocument';
import { CompletionItem, CompletionItemKind, DocumentSymbol, Location, SymbolKind } from 'vscode-languageserver';

export class ParsedStruct extends ParsedCode {
    public properties: ParsedStructVariable[] = [];
    public id: any;
    private completionItem: CompletionItem = null;

    public initialise(element: any, document: ParsedDocument,  contract: ParsedContract, isGlobal: boolean) {
        this.contract = contract;
        this.element = element;
        this.id = element.id;
        this.name = element.name;
        this.document = document;
        this.isGlobal = isGlobal;

        if (this.element.body !== 'undefined') {
            this.element.body.forEach(structBodyElement => {
                if (structBodyElement.type === 'DeclarativeExpression') {
                    const variable = new ParsedStructVariable();
                    variable.initialiseStructVariable(structBodyElement, this.contract, this.document, this);
                    this.properties.push(variable);
                }
            });
        }
    }

    public toDocumentSymbol(): DocumentSymbol {
        const name = this.name || 'Unnamed';
        const structRange = this.getRange();
        const structSymbol = DocumentSymbol.create(
            name,
            this.getSimpleInfo(),
            SymbolKind.Struct,
            structRange,
            structRange,
        );
        structSymbol.children = this.properties.map(property => property.toDocumentSymbolType());

        return structSymbol;
    }

    public override getSimpleInfo(): string {
        const properties = this.properties
            .map(prop => `${prop.name}: ${prop.type.getSimpleInfo()}`)
            .join(', ');
        return `Struct ${this.name} { ${properties} }`;
    }

    public getInnerMembers(): ParsedCode[] {
        return this.properties;
    }

    public getVariableSelected(offset: number) {
       return this.properties.find(x => {
            return x.isCurrentElementedSelected(offset);
        });
    }

    public override getSelectedItem(offset: number): ParsedCode {
        if (this.isCurrentElementedSelected(offset)) {
            const variableSelected = this.getVariableSelected(offset);
             if (variableSelected !== undefined) {
                 return variableSelected;
             } else {
                return this;
             }
       }
       return null;
    }

    public override getSelectedTypeReferenceLocation(offset: number): FindTypeReferenceLocationResult[] {
        if (this.isCurrentElementedSelected(offset)) {
             const variableSelected = this.getVariableSelected(offset);
              if (variableSelected !== undefined) {
                  return variableSelected.getSelectedTypeReferenceLocation(offset);
              } else {
                  return [FindTypeReferenceLocationResult.create(true)];
              }
        }
        return [FindTypeReferenceLocationResult.create(false)];
    }

    public createCompletionItem(): CompletionItem {
        if (this.completionItem === null) {
            const completionItem =  CompletionItem.create(this.name);
            completionItem.kind = CompletionItemKind.Struct;
            completionItem.insertText = this.name;
            completionItem.documentation = this.getMarkupInfo();
            this.completionItem = completionItem;
        }
        return this.completionItem;
    }

    public override getInnerCompletionItems(): CompletionItem[] {
        const completionItems: CompletionItem[] = [];
        this.properties.forEach(x =>  completionItems.push(x.createCompletionItem()));
        return completionItems;
    }

    public getAllReferencesToSelected(offset: number, documents: ParsedDocument[]): FindTypeReferenceLocationResult[] {
        if (this.isCurrentElementedSelected(offset)) {
            const selectedProperty = this.getSelectedProperty(offset);
            if (selectedProperty !== undefined) {
                return selectedProperty.getAllReferencesToThis(documents);
            } else {
                return this.getAllReferencesToThis(documents);
            }
        }
        return [];
    }

    public getSelectedProperty(offset: number) {
        return this.properties.find(x => x.isCurrentElementedSelected(offset));
    }

    public override getParsedObjectType(): string {
        return 'Struct';
    }


    public override getInfo(): string {
        return    '### ' + this.getParsedObjectType()  + ': ' +  this.name + '\n' +
                  '#### ' + this.getContractNameOrGlobal() + '\n' +
                  this.getComment();
    }

}
